const { withTransaction, query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errors');

const PULL_SAFETY_MS = 10000;
const SCHEMA_SUPPLIERS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// PULL  GET /api/sync/pull?last_pulled_at=<unix_ms>
//
// Returns all rows modified after last_pulled_at for this business.
// Mobile calls this on reconnect to get server-side changes.
// ─────────────────────────────────────────────────────────────────────────────
const pull = asyncHandler(async (req, res) => {
    const businessId = req.business.id;
    const since = parseInt(req.query.last_pulled_at) || 0;
    // Clients that understand the newer tables say so; older installed APKs
    // must never receive a table their local schema doesn't have (WatermelonDB
    // would throw and that phone would stop syncing entirely).
    const clientSchema = parseInt(req.query.schema_version) || 0;
    // Hand back a cursor slightly in the past: a transaction that stamped its
    // server_ts just before this moment but commits just after it would
    // otherwise be skipped forever. Re-pulling a few seconds of rows is a
    // harmless idempotent upsert on the phone.
    const now = Date.now() - PULL_SAFETY_MS;

    const [products, batches, transactions, orders, items, customers, ledger] = await Promise.all([

        query(
            `SELECT id, business_id, name, category, barcode, brand, unit,
          reorder_level, schedule_h,
          selling_price::FLOAT  AS selling_price,
          archived_at::FLOAT    AS archived_at,
          regular_price::FLOAT  AS regular_price,
          sale_until::FLOAT     AS sale_until,
          sync_status,
          updated_at::FLOAT     AS updated_at
         FROM products
         WHERE business_id = $1 AND server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT sb.id, sb.product_id,
          sb.quantity,
          sb.batch_no,
          sb.expiry_date::FLOAT  AS expiry_date,
          sb.supplier_id,
          sb.cost_price::FLOAT   AS cost_price,
          sb.sync_status,
          sb.created_at::FLOAT   AS created_at,
          sb.updated_at::FLOAT   AS updated_at
         FROM stock_batches sb
         JOIN products p ON p.id = sb.product_id
         WHERE p.business_id = $1 AND sb.server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT st.id, st.product_id, st.batch_id, st.type,
          st.quantity,
          st.txn_at::FLOAT      AS txn_at,
          st.sync_status,
          st.updated_at::FLOAT  AS updated_at
         FROM stock_transactions st
         JOIN products p ON p.id = st.product_id
         WHERE p.business_id = $1 AND st.server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT id, business_id, customer_id,
          total_amount::FLOAT  AS total_amount,
          payment_mode,
          sale_at::FLOAT       AS sale_at,
          voided_at::FLOAT     AS voided_at,
          sync_status,
          updated_at::FLOAT    AS updated_at
         FROM sale_orders
         WHERE business_id = $1 AND server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT si.id, si.order_id, si.product_id, si.batch_id,
          si.quantity,
          si.unit_price::FLOAT  AS unit_price,
          si.updated_at::FLOAT  AS updated_at
         FROM sale_items si
         JOIN sale_orders so ON so.id = si.order_id
         WHERE so.business_id = $1 AND si.server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT id, business_id, name, phone, address, segment,
          last_purchase_at::FLOAT  AS last_purchase_at,
          archived_at::FLOAT       AS archived_at,
          sync_status,
          updated_at::FLOAT        AS updated_at
         FROM customers
         WHERE business_id = $1 AND server_ts > $2`,
            [businessId, since]
        ),

        query(
            `SELECT id, business_id, customer_id, order_id, type,
          amount::FLOAT         AS amount,
          note,
          entry_at::FLOAT       AS entry_at,
          sync_status,
          updated_at::FLOAT     AS updated_at
         FROM ledger_entries
         WHERE business_id = $1 AND server_ts > $2`,
            [businessId, since]
        ),
    ]);

    let extra = {};
    if (clientSchema >= SCHEMA_SUPPLIERS) {
        const [suppliers, pos] = await Promise.all([
            query(
                `SELECT id, business_id, name, phone, note,
          archived_at::FLOAT AS archived_at, sync_status,
          updated_at::FLOAT AS updated_at
         FROM suppliers WHERE business_id = $1 AND server_ts > $2`,
                [businessId, since]
            ),
            query(
                `SELECT id, business_id, supplier_id, status, items_json, note,
          ordered_at::FLOAT AS ordered_at, sync_status,
          updated_at::FLOAT AS updated_at
         FROM purchase_orders WHERE business_id = $1 AND server_ts > $2`,
                [businessId, since]
            ),
        ]);
        extra = {
            suppliers: { created: suppliers.rows, updated: [], deleted: [] },
            purchase_orders: { created: pos.rows, updated: [], deleted: [] },
        };
    }

    res.json({
        timestamp: now,
        changes: {
            products: { created: products.rows, updated: [], deleted: [] },
            stock_batches: { created: batches.rows, updated: [], deleted: [] },
            stock_transactions: { created: transactions.rows, updated: [], deleted: [] },
            sale_orders: { created: orders.rows, updated: [], deleted: [] },
            sale_items: { created: items.rows, updated: [], deleted: [] },
            customers: { created: customers.rows, updated: [], deleted: [] },
            ledger_entries: { created: ledger.rows, updated: [], deleted: [] },
            ...extra,
        },
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH  POST /api/sync/push
//
// Receives batched local changes from mobile.
// Uses INSERT ... ON CONFLICT DO UPDATE (upsert) so re-pushes are idempotent.
// All tables processed in one transaction — atomic.
// ─────────────────────────────────────────────────────────────────────────────
const push = asyncHandler(async (req, res) => {
    const businessId = req.business.id;
    const { changes } = req.body;

    if (!changes) return res.status(422).json({ error: 'Missing changes payload' });

    const now = Date.now();
    const isStaff = req.role === 'staff';

    // WatermelonDB splits local writes into created / updated / deleted buckets.
    // Every table below upserts (ON CONFLICT DO UPDATE) or safely no-ops
    // (ON CONFLICT DO NOTHING), so a created row and an updated row take the
    // exact same code path. We therefore process BOTH buckets together —
    // otherwise updates (e.g. a customer's last_purchase_at, an edited product
    // price) are silently discarded and never reach the server.
    const upserts = (tableChanges) => [
        ...(tableChanges?.created || []),
        ...(tableChanges?.updated || []),
    ];

    await withTransaction(async (client) => {

        // ── Products ─────────────────────────────────────────────────────────────
        for (const p of upserts(changes.products)) {
            await client.query(
                `INSERT INTO products
           (id, business_id, name, category, barcode, brand, unit,
            reorder_level, schedule_h, selling_price, archived_at, regular_price, sale_until, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$13,$15,$17,'synced',$11)
         ON CONFLICT (id) DO UPDATE SET
           name           = EXCLUDED.name,
           category       = EXCLUDED.category,
           barcode        = EXCLUDED.barcode,
           brand          = EXCLUDED.brand,
           unit           = EXCLUDED.unit,
           reorder_level  = EXCLUDED.reorder_level,
           schedule_h     = EXCLUDED.schedule_h,
           -- staff may add products but not reprice existing ones
           selling_price  = CASE WHEN $12 THEN products.selling_price ELSE EXCLUDED.selling_price END,
           -- archiving is owner-only; older apps don't send the field at all
           archived_at    = CASE WHEN $14 AND NOT $12 THEN EXCLUDED.archived_at ELSE products.archived_at END,
           -- starting/ending a discount is a price change, so owner-only too
           regular_price  = CASE WHEN $16 AND NOT $12 THEN EXCLUDED.regular_price ELSE products.regular_price END,
           sale_until     = CASE WHEN $18 AND NOT $12 THEN EXCLUDED.sale_until ELSE products.sale_until END,
           sync_status    = 'synced',
           updated_at     = EXCLUDED.updated_at`,
                [p.id, businessId, p.name, p.category, p.barcode || null, p.brand || null,
                p.unit, p.reorder_level ?? 5, p.schedule_h ?? false,
                p.selling_price ?? 0, p.updated_at ?? now, isStaff,
                p.archived_at || null, 'archived_at' in p,
                p.regular_price || null, 'regular_price' in p,
                p.sale_until || null, 'sale_until' in p]
            );
        }

        // ── Stock batches ─────────────────────────────────────────────────────────
        for (const b of upserts(changes.stock_batches)) {
            await client.query(
                `INSERT INTO stock_batches
           (id, product_id, quantity, batch_no, expiry_date, cost_price, supplier_id, sync_status, updated_at, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$8,'synced',$7,$7)
         ON CONFLICT (id) DO UPDATE SET
           quantity     = EXCLUDED.quantity,
           supplier_id  = EXCLUDED.supplier_id,
           sync_status  = 'synced',
           updated_at   = EXCLUDED.updated_at`,
                // batch_no/expiry are optional (loose goods) — store NULL, not ''/0
                [b.id, b.product_id, b.quantity, b.batch_no || null,
                b.expiry_date || null, b.cost_price ?? 0, b.updated_at ?? now,
                b.supplier_id || null]
            );
        }

        // ── Stock transactions (append-only — ON CONFLICT DO NOTHING) ─────────────
        for (const t of upserts(changes.stock_transactions)) {
            await client.query(
                `INSERT INTO stock_transactions
           (id, product_id, batch_id, type, quantity, txn_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,'synced',$7)
         ON CONFLICT (id) DO NOTHING`,   // truly append-only
                [t.id, t.product_id, t.batch_id || null,
                t.type, t.quantity, t.txn_at, t.updated_at ?? now]
            );
        }

        // ── Customers ─────────────────────────────────────────────────────────────
        // phone is optional (only required client-side for credit sales) — send
        // NULL rather than '' so UNIQUE(business_id, phone) never sees two
        // phone-less customers as "the same" empty string.
        for (const c of upserts(changes.customers)) {
            await client.query(
                `INSERT INTO customers
           (id, business_id, name, phone, address, segment, last_purchase_at, archived_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$9,'synced',$8)
         ON CONFLICT (id) DO UPDATE SET
           name             = EXCLUDED.name,
           phone            = EXCLUDED.phone,
           address          = EXCLUDED.address,
           segment          = EXCLUDED.segment,
           last_purchase_at = EXCLUDED.last_purchase_at,
           archived_at      = CASE WHEN $10 THEN EXCLUDED.archived_at ELSE customers.archived_at END,
           sync_status      = 'synced',
           updated_at       = EXCLUDED.updated_at`,
                [c.id, businessId, c.name, c.phone || null, c.address || null, c.segment || 'new',
                c.last_purchase_at || null, c.updated_at ?? now,
                c.archived_at || null, 'archived_at' in c]
            );
        }

        // ── Sale orders ───────────────────────────────────────────────────────────
        for (const o of upserts(changes.sale_orders)) {
            await client.query(
                `INSERT INTO sale_orders
           (id, business_id, customer_id, total_amount, payment_mode, sale_at, voided_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$8,'synced',$7)
         -- orders are immutable once created; the one allowed change is the
         -- owner voiding it (once — a void is never undone)
         ON CONFLICT (id) DO UPDATE SET
           voided_at  = EXCLUDED.voided_at,
           updated_at = EXCLUDED.updated_at
         WHERE sale_orders.business_id = $2 AND sale_orders.voided_at IS NULL
           AND EXCLUDED.voided_at IS NOT NULL AND NOT $9`,
                [o.id, businessId, o.customer_id || null,
                o.total_amount, o.payment_mode || 'cash', o.sale_at, o.updated_at ?? now,
                o.voided_at || null, isStaff]
            );
        }

        // ── Sale items ────────────────────────────────────────────────────────────
        for (const si of upserts(changes.sale_items)) {
            await client.query(
                `INSERT INTO sale_items
           (id, order_id, product_id, batch_id, quantity, unit_price, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING`,
                [si.id, si.order_id, si.product_id, si.batch_id || null,
                si.quantity, si.unit_price, si.updated_at ?? now]
            );
        }

        // ── Ledger entries (khata — append-only, immutable) ───────────────────────
        for (const e of upserts(changes.ledger_entries)) {
            await client.query(
                `INSERT INTO ledger_entries
           (id, business_id, customer_id, order_id, type, amount, note, entry_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'synced',$9)
         ON CONFLICT (id) DO NOTHING`,   // a ledger entry is never edited after it's written
                [e.id, businessId, e.customer_id, e.order_id || null,
                e.type, e.amount, e.note || null, e.entry_at, e.updated_at ?? now]
            );
        }

        // ── Suppliers ─────────────────────────────────────────────────────────────
        for (const sp of upserts(changes.suppliers)) {
            await client.query(
                `INSERT INTO suppliers (id, business_id, name, phone, note, archived_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$7,'synced',$6)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, phone = EXCLUDED.phone, note = EXCLUDED.note,
           archived_at = CASE WHEN $8 THEN EXCLUDED.archived_at ELSE suppliers.archived_at END,
           sync_status = 'synced', updated_at = EXCLUDED.updated_at
         WHERE suppliers.business_id = $2`,
                [sp.id, businessId, sp.name, sp.phone || null, sp.note || null, sp.updated_at ?? now,
                sp.archived_at || null, 'archived_at' in sp]
            );
        }

        // ── Purchase orders ───────────────────────────────────────────────────────
        for (const po of upserts(changes.purchase_orders)) {
            await client.query(
                `INSERT INTO purchase_orders
           (id, business_id, supplier_id, status, items_json, note, ordered_at, sync_status, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'synced',$8)
         ON CONFLICT (id) DO UPDATE SET
           supplier_id = EXCLUDED.supplier_id, status = EXCLUDED.status,
           items_json = EXCLUDED.items_json, note = EXCLUDED.note,
           sync_status = 'synced', updated_at = EXCLUDED.updated_at
         WHERE purchase_orders.business_id = $2`,
                [po.id, businessId, po.supplier_id || null, po.status || 'draft',
                po.items_json || '[]', po.note || null, po.ordered_at || now, po.updated_at ?? now]
            );
        }

        // NOTE: the `deleted` bucket is intentionally not processed. The app has
        // no hard-delete flows, and sales/transactions are immutable financial
        // records. Deletions (e.g. deactivating a product) should be modelled as
        // soft-deletes (an is_active flag synced via updated) rather than
        // destructive DELETEs. Revisit here if/when a delete flow is added.
    });

    res.json({ success: true, synced_at: now });
});

module.exports = { pull, push };
