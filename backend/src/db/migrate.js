require('dotenv').config();
const { pool } = require('./pool');

const migrations = [

    // ── 001: businesses ───────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS businesses (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'kirana',
  phone       TEXT        UNIQUE NOT NULL,
  password_hash TEXT      NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,

    // ── 002: products ─────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS products (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  category       TEXT        NOT NULL DEFAULT 'Other',
  barcode        TEXT,
  brand          TEXT,
  unit           TEXT        NOT NULL DEFAULT 'pcs',
  reorder_level  INTEGER     NOT NULL DEFAULT 5,
  schedule_h     BOOLEAN     NOT NULL DEFAULT FALSE,
  selling_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  sync_status    TEXT        NOT NULL DEFAULT 'synced',
  updated_at     BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
    `CREATE INDEX IF NOT EXISTS idx_products_business    ON products(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_products_barcode     ON products(barcode) WHERE barcode IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_products_updated_at  ON products(updated_at)`,

    // ── 003: stock_batches ────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS stock_batches (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity     INTEGER     NOT NULL CHECK (quantity >= 0),
  batch_no     TEXT        NOT NULL,
  expiry_date  BIGINT      NOT NULL,
  cost_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  sync_status  TEXT        NOT NULL DEFAULT 'synced',
  created_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_product     ON stock_batches(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_expiry      ON stock_batches(expiry_date)`,
    `CREATE INDEX IF NOT EXISTS idx_batches_updated_at  ON stock_batches(updated_at)`,

    // ── 004: stock_transactions ───────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS stock_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_id     UUID        REFERENCES stock_batches(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL CHECK (type IN ('stock_in','sale','wastage','return')),
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  txn_at       BIGINT      NOT NULL,
  sync_status  TEXT        NOT NULL DEFAULT 'synced',
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
)`,
    `CREATE INDEX IF NOT EXISTS idx_txn_product     ON stock_transactions(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_txn_batch       ON stock_transactions(batch_id)`,
    `CREATE INDEX IF NOT EXISTS idx_txn_type        ON stock_transactions(type)`,
    `CREATE INDEX IF NOT EXISTS idx_txn_updated_at  ON stock_transactions(updated_at)`,

    // ── 005: customers ────────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS customers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name             TEXT        NOT NULL,
  phone            TEXT        NOT NULL,
  segment          TEXT        NOT NULL DEFAULT 'new',
  last_purchase_at BIGINT,
  sync_status      TEXT        NOT NULL DEFAULT 'synced',
  updated_at       BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, phone)
)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_business    ON customers(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_phone       ON customers(phone)`,
    `CREATE INDEX IF NOT EXISTS idx_customers_updated_at  ON customers(updated_at)`,

    // ── 006: sale_orders ──────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS sale_orders (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id   UUID        REFERENCES customers(id) ON DELETE SET NULL,
  total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_mode  TEXT        NOT NULL DEFAULT 'cash',
  sale_at       BIGINT      NOT NULL,
  sync_status   TEXT        NOT NULL DEFAULT 'synced',
  updated_at    BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_business    ON sale_orders(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_customer    ON sale_orders(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_sale_at     ON sale_orders(sale_at)`,
    `CREATE INDEX IF NOT EXISTS idx_orders_updated_at  ON sale_orders(updated_at)`,

    // ── 007: sale_items ───────────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS sale_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID        NOT NULL REFERENCES sale_orders(id) ON DELETE CASCADE,
  product_id   UUID        NOT NULL REFERENCES products(id),
  batch_id     UUID        REFERENCES stock_batches(id) ON DELETE SET NULL,
  quantity     INTEGER     NOT NULL CHECK (quantity > 0),
  unit_price   NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
)`,
    `CREATE INDEX IF NOT EXISTS idx_items_order       ON sale_items(order_id)`,
    `CREATE INDEX IF NOT EXISTS idx_items_product     ON sale_items(product_id)`,
    `CREATE INDEX IF NOT EXISTS idx_items_updated_at  ON sale_items(updated_at)`,

    // ── 008: barcode_catalog (OpenFoodFacts India seed — read-only) ───────────────
    `CREATE TABLE IF NOT EXISTS barcode_catalog (
  barcode   TEXT PRIMARY KEY,
  name      TEXT,
  brand     TEXT,
  category  TEXT,
  quantity  TEXT,
  source    TEXT NOT NULL DEFAULT 'openfoodfacts'
)`,
    `CREATE INDEX IF NOT EXISTS idx_catalog_name ON barcode_catalog USING gin(to_tsvector('english', coalesce(name,'')))`,

    // ── 009: ledger_entries (khata / customer credit ledger — append-only) ────────
    // Append-only double-entry-style ledger. A customer's outstanding balance is
    // DERIVED as SUM(credit_sale) - SUM(repayment); there is no balance column.
    `CREATE TABLE IF NOT EXISTS ledger_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id     UUID        REFERENCES sale_orders(id) ON DELETE SET NULL,
  type         TEXT        NOT NULL CHECK (type IN ('credit_sale','repayment')),
  amount       NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note         TEXT,
  entry_at     BIGINT      NOT NULL,
  sync_status  TEXT        NOT NULL DEFAULT 'synced',
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000
)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_business    ON ledger_entries(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_customer    ON ledger_entries(customer_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ledger_updated_at  ON ledger_entries(updated_at)`,

    // ── 010: customers — phone becomes optional, address added ────────────────────
    // Phone is only load-bearing for khata (need someone to identify/contact for an
    // unpaid balance); a cash/UPI-only customer can now be saved by name alone.
    // Address is free text ("Sunrise Society", "Flat 302, B Wing") — it doubles as
    // the disambiguator shown under a name in the mobile app's customer search.
    // UNIQUE(business_id, phone) still holds: Postgres never treats two NULLs as
    // equal, so any number of phone-less customers can coexist under one business.
    `ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT`,

    // ── 011: server-side sync cursor ──────────────────────────────────────────────
    // Pull used to filter on updated_at, which the PHONE writes. A phone with a
    // wrong clock (or a row written offline and pushed hours later) could land
    // behind another device's last_pulled_at and never be pulled. server_ts is
    // stamped by Postgres on every insert/update, so the cursor only ever
    // compares server time with server time. Additive: existing rows are
    // backfilled from updated_at, and the API response shape is unchanged, so
    // already-installed APKs keep working.
    `CREATE OR REPLACE FUNCTION set_server_ts() RETURNS trigger AS $$
BEGIN
  NEW.server_ts := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  RETURN NEW;
END $$ LANGUAGE plpgsql`,
    ...['products', 'stock_batches', 'stock_transactions', 'customers',
        'sale_orders', 'sale_items', 'ledger_entries'].flatMap(t => [
        `ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS server_ts BIGINT`,
        `UPDATE ${t} SET server_ts = updated_at WHERE server_ts IS NULL`,
        `CREATE INDEX IF NOT EXISTS idx_${t}_server_ts ON ${t}(server_ts)`,
        `DROP TRIGGER IF EXISTS trg_${t}_server_ts ON ${t}`,
        `CREATE TRIGGER trg_${t}_server_ts BEFORE INSERT OR UPDATE ON ${t}
           FOR EACH ROW EXECUTE FUNCTION set_server_ts()`,
    ]),

    // ── 012: batch number + expiry optional ───────────────────────────────────────
    // Loose kirana goods (rice, sugar, dal) have neither. Required-ness is now a
    // per-shop-type rule enforced in the app (pharmacy still requires both).
    `ALTER TABLE stock_batches ALTER COLUMN batch_no DROP NOT NULL`,
    `ALTER TABLE stock_batches ALTER COLUMN expiry_date DROP NOT NULL`,

    // ── 013: shop profile for bills + UPI payment links ───────────────────────────
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS upi_id  TEXT`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE businesses ADD COLUMN IF NOT EXISTS gstin   TEXT`,

    // ── 014: suppliers + purchase orders ──────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID        PRIMARY KEY,
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  phone        TEXT,
  note         TEXT,
  sync_status  TEXT        NOT NULL DEFAULT 'synced',
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  server_ts    BIGINT
)`,
    `CREATE INDEX IF NOT EXISTS idx_suppliers_business  ON suppliers(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_suppliers_server_ts ON suppliers(server_ts)`,
    `ALTER TABLE stock_batches ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL`,
    // A purchase order is a small draft list sent to a supplier over WhatsApp;
    // its lines are stored as JSON text ([{product_id,name,quantity}]) because
    // they're never queried line-by-line and it keeps sync to one table.
    `CREATE TABLE IF NOT EXISTS purchase_orders (
  id           UUID        PRIMARY KEY,
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  supplier_id  UUID        REFERENCES suppliers(id) ON DELETE SET NULL,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','cancelled')),
  items_json   TEXT        NOT NULL DEFAULT '[]',
  note         TEXT,
  ordered_at   BIGINT      NOT NULL,
  sync_status  TEXT        NOT NULL DEFAULT 'synced',
  updated_at   BIGINT      NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW()) * 1000,
  server_ts    BIGINT
)`,
    `CREATE INDEX IF NOT EXISTS idx_po_business  ON purchase_orders(business_id)`,
    `CREATE INDEX IF NOT EXISTS idx_po_server_ts ON purchase_orders(server_ts)`,
    ...['suppliers', 'purchase_orders'].flatMap(t => [
        `DROP TRIGGER IF EXISTS trg_${t}_server_ts ON ${t}`,
        `CREATE TRIGGER trg_${t}_server_ts BEFORE INSERT OR UPDATE ON ${t}
           FOR EACH ROW EXECUTE FUNCTION set_server_ts()`,
    ]),

    // ── 015: staff accounts ───────────────────────────────────────────────────────
    // The business row stays the owner login (existing accounts are untouched).
    // Staff are extra logins under a business with restricted permissions.
    `CREATE TABLE IF NOT EXISTS staff (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  phone          TEXT        UNIQUE NOT NULL,
  password_hash  TEXT        NOT NULL,
  active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
    `CREATE INDEX IF NOT EXISTS idx_staff_business ON staff(business_id)`,

    // ── 016: voice usage (per-shop daily quota for the Gemini endpoint) ───────────
    `CREATE TABLE IF NOT EXISTS voice_usage (
  business_id  UUID    NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day          DATE    NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (business_id, day)
)`,

    // ── 017: soft deletes ─────────────────────────────────────────────────────────
    // Sales and khata are financial records, so nothing is ever hard-deleted:
    // products/customers/suppliers get archived (hidden from pickers, history
    // kept) and a wrong bill gets voided (stock and khata reversed by
    // compensating rows; the order stays for the audit trail).
    `ALTER TABLE products   ADD COLUMN IF NOT EXISTS archived_at BIGINT`,
    `ALTER TABLE customers  ADD COLUMN IF NOT EXISTS archived_at BIGINT`,
    `ALTER TABLE suppliers  ADD COLUMN IF NOT EXISTS archived_at BIGINT`,
    `ALTER TABLE sale_orders ADD COLUMN IF NOT EXISTS voided_at BIGINT`,

    // ── 018: clearance discounts ──────────────────────────────────────────────────
    // A product on sale keeps its normal price here while selling_price holds the
    // discounted one. NULL = not discounted. Ending the sale copies it back.
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS regular_price NUMERIC(10,2)`,
    // optional end of the sale; the phone reverts the price once it passes
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_until BIGINT`,

];

async function migrate() {
    console.log('Running migrations...');
    for (const [i, sql] of migrations.entries()) {
        try {
            await pool.query(sql);
            const preview = sql.trim().slice(0, 60).replace(/\s+/g, ' ');
            console.log(`  ✓ [${String(i + 1).padStart(2, '0')}] ${preview}...`);
        } catch (err) {
            console.error(`  ✗ Migration ${i + 1} failed:`, err.message);
            process.exit(1);
        }
    }
    console.log('\nAll migrations complete.');
    await pool.end();
}

migrate();