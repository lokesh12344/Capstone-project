const { query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errors');

// GET /api/products
const list = asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT
       p.*,
       COALESCE(
         (SELECT SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END)
          FROM stock_transactions st WHERE st.product_id = p.id),
         0
       ) AS current_stock,
       (SELECT MIN(sb.expiry_date)
        FROM stock_batches sb
        WHERE sb.product_id = p.id AND sb.expiry_date > $2
       ) AS nearest_expiry
     FROM products p
     WHERE p.business_id = $1 AND p.archived_at IS NULL
     ORDER BY p.name ASC`,
        [req.business.id, Date.now()]
    );
    res.json({ products: rows });
});

// GET /api/products/:id
const get = asyncHandler(async (req, res) => {
    const { rows } = await query(
        `SELECT p.*,
       COALESCE(
         (SELECT SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END)
          FROM stock_transactions st WHERE st.product_id = p.id),
         0
       ) AS current_stock
     FROM products p
     WHERE p.id = $1 AND p.business_id = $2`,
        [req.params.id, req.business.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const batches = await query(
        'SELECT * FROM stock_batches WHERE product_id = $1 ORDER BY expiry_date ASC',
        [req.params.id]
    );
    res.json({ product: rows[0], batches: batches.rows });
});

// GET /api/products/low-stock
const lowStock = asyncHandler(async (req, res) => {
    const { rows } = await query(
        // Stock is derived per product in a subquery, then filtered outside it —
        // a WHERE can't see the current_stock alias, and HAVING isn't for this.
        `SELECT * FROM (
       SELECT
         p.id, p.name, p.category, p.unit, p.reorder_level,
         COALESCE(
           (SELECT SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END)
            FROM stock_transactions st WHERE st.product_id = p.id),
           0
         ) AS current_stock
       FROM products p
       WHERE p.business_id = $1 AND p.archived_at IS NULL
     ) s
     WHERE s.current_stock <= s.reorder_level
     ORDER BY s.current_stock ASC`,
        [req.business.id]
    );
    res.json({ low_stock: rows });
});

// GET /api/products/near-expiry?days=30
const nearExpiry = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const cutoff = Date.now() + days * 86400000;

    const { rows } = await query(
        `SELECT
       sb.id AS batch_id, sb.batch_no, sb.expiry_date,
       sb.quantity, sb.cost_price,
       p.id AS product_id, p.name AS product_name, p.category
     FROM stock_batches sb
     JOIN products p ON p.id = sb.product_id
     WHERE p.business_id = $1
       AND sb.expiry_date <= $2
     ORDER BY sb.expiry_date ASC`,
        [req.business.id, cutoff]
    );
    res.json({ near_expiry: rows });
});

// ── Clearance discounts from the web dashboard ───────────────────────────────
// Same columns the phone writes through sync: the normal price is parked in
// regular_price and selling_price becomes the sale price. Bumping updated_at
// (and server_ts, via trigger) makes every phone pull the new price on its
// next sync. Owner-only (enforced in the route).

// POST /api/products/:id/discount   { sale_price, days? }
const applyDiscount = asyncHandler(async (req, res) => {
    const salePrice = Number(req.body.sale_price);
    const days = req.body.days == null ? null : Number(req.body.days);
    if (!Number.isFinite(salePrice) || salePrice <= 0) {
        return res.status(422).json({ error: 'sale_price must be a positive number' });
    }
    if (days !== null && (!Number.isInteger(days) || days < 1 || days > 90)) {
        return res.status(422).json({ error: 'days must be a whole number from 1 to 90' });
    }

    const { rows: found } = await query(
        `SELECT selling_price::FLOAT AS selling_price, regular_price::FLOAT AS regular_price
         FROM products WHERE id = $1 AND business_id = $2 AND archived_at IS NULL`,
        [req.params.id, req.business.id]
    );
    if (found.length === 0) return res.status(404).json({ error: 'Product not found' });
    const normal = found[0].regular_price || found[0].selling_price;
    if (salePrice >= normal) {
        return res.status(422).json({ error: `Sale price must be below the normal price (₹${normal})` });
    }

    const now = Date.now();
    const { rows } = await query(
        `UPDATE products SET
           regular_price = $3, selling_price = $4, sale_until = $5,
           sync_status = 'synced', updated_at = $6
         WHERE id = $1 AND business_id = $2
         RETURNING id, name, selling_price::FLOAT AS sale_price,
                   regular_price::FLOAT AS regular_price, sale_until::FLOAT AS sale_until`,
        [req.params.id, req.business.id, normal, salePrice, days ? now + days * 86400000 : null, now]
    );
    res.json({ product: rows[0] });
});

// DELETE /api/products/:id/discount — back to the normal price
const endDiscount = asyncHandler(async (req, res) => {
    const { rows } = await query(
        `UPDATE products SET
           selling_price = COALESCE(regular_price, selling_price),
           regular_price = NULL, sale_until = NULL,
           sync_status = 'synced', updated_at = $3
         WHERE id = $1 AND business_id = $2
         RETURNING id, name, selling_price::FLOAT AS selling_price`,
        [req.params.id, req.business.id, Date.now()]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: rows[0] });
});

module.exports = { list, get, lowStock, nearExpiry, applyDiscount, endDiscount };