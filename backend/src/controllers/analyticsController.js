const { query } = require('../db/pool');
const { asyncHandler } = require('../middleware/errors');

const DAY_MS = 24 * 60 * 60 * 1000;

// GET /api/analytics/sales?period=daily|weekly|monthly
const sales = asyncHandler(async (req, res) => {
    const businessId = req.business.id;
    const period = req.query.period || 'daily';

    const trunc = period === 'monthly' ? 'month' : period === 'weekly' ? 'week' : 'day';

    const { rows } = await query(
        `SELECT
       DATE_TRUNC($1, TO_TIMESTAMP(sale_at / 1000)) AS period,
       COUNT(*)                                      AS order_count,
       SUM(total_amount)                             AS revenue,
       SUM(CASE WHEN payment_mode='cash'   THEN total_amount ELSE 0 END) AS cash,
       SUM(CASE WHEN payment_mode='upi'    THEN total_amount ELSE 0 END) AS upi,
       SUM(CASE WHEN payment_mode='credit' THEN total_amount ELSE 0 END) AS credit
     FROM sale_orders
     WHERE business_id = $2 AND voided_at IS NULL
       AND TO_TIMESTAMP(sale_at / 1000) >= NOW() - INTERVAL '90 days'
     GROUP BY 1
     ORDER BY 1 DESC`,
        [trunc, businessId]
    );
    res.json({ period, data: rows });
});

// GET /api/analytics/top-products?limit=10
const topProducts = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

    const { rows } = await query(
        `SELECT
       p.id, p.name, p.category, p.unit,
       SUM(si.quantity)                 AS units_sold,
       SUM(si.quantity * si.unit_price) AS revenue
     FROM sale_items si
     JOIN products p ON p.id = si.product_id
     JOIN sale_orders so ON so.id = si.order_id
     WHERE so.business_id = $1 AND so.voided_at IS NULL
       AND TO_TIMESTAMP(so.sale_at / 1000) >= NOW() - INTERVAL '30 days'
     GROUP BY p.id
     ORDER BY units_sold DESC
     LIMIT $2`,
        [req.business.id, limit]
    );
    res.json({ top_products: rows });
});

// GET /api/analytics/customers
const customerStats = asyncHandler(async (req, res) => {
    const businessId = req.business.id;

    const { rows } = await query(
        `WITH customer_activity AS (
       SELECT
         c.id, c.name, c.phone,
         COUNT(so.id)         AS order_count_30d,
         SUM(so.total_amount) AS spend_30d,
         MAX(so.sale_at)      AS last_order_at
       FROM customers c
       LEFT JOIN sale_orders so
         ON so.customer_id = c.id
         AND TO_TIMESTAMP(so.sale_at / 1000) >= NOW() - INTERVAL '30 days'
         AND so.voided_at IS NULL
       WHERE c.business_id = $1
       GROUP BY c.id
     )
     SELECT *,
       CASE
         WHEN order_count_30d >= 4 THEN 'regular'
         WHEN order_count_30d  > 0 THEN 'occasional'
         WHEN last_order_at IS NULL THEN 'new'
         ELSE 'dormant'
       END AS computed_segment
     FROM customer_activity
     ORDER BY spend_30d DESC NULLS LAST`,
        [businessId]
    );

    const summary = {
        total: rows.length,
        regular: rows.filter(r => r.computed_segment === 'regular').length,
        occasional: rows.filter(r => r.computed_segment === 'occasional').length,
        dormant: rows.filter(r => r.computed_segment === 'dormant').length,
        new: rows.filter(r => r.computed_segment === 'new').length,
    };

    res.json({ summary, customers: rows });
});

// GET /api/analytics/dashboard
const dashboard = asyncHandler(async (req, res) => {
    const businessId = req.business.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todaySales, lowStock, nearExpiry, topProds] = await Promise.all([
        query(
            `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS revenue
       FROM sale_orders
       WHERE business_id = $1 AND sale_at >= $2 AND voided_at IS NULL`,
            [businessId, todayStart.getTime()]
        ),
        query(
            `SELECT COUNT(*) AS count FROM products p
       WHERE p.business_id = $1 AND p.archived_at IS NULL
       AND COALESCE((
         SELECT SUM(CASE WHEN type IN ('stock_in','return') THEN quantity ELSE -quantity END)
         FROM stock_transactions WHERE product_id = p.id
       ), 0) <= p.reorder_level`,
            [businessId]
        ),
        query(
            `SELECT COUNT(*) AS count FROM stock_batches sb
       JOIN products p ON p.id = sb.product_id
       WHERE p.business_id = $1 AND sb.expiry_date <= $2`,
            [businessId, Date.now() + 7 * DAY_MS]
        ),
        query(
            `SELECT p.name, SUM(si.quantity) AS units
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       JOIN sale_orders so ON so.id = si.order_id
       WHERE so.business_id = $1 AND so.voided_at IS NULL
         AND TO_TIMESTAMP(so.sale_at/1000) >= NOW() - INTERVAL '7 days'
       GROUP BY p.id ORDER BY units DESC LIMIT 5`,
            [businessId]
        ),
    ]);

    res.json({
        today: {
            orders: parseInt(todaySales.rows[0].count, 10),
            revenue: parseFloat(todaySales.rows[0].revenue),
        },
        alerts: {
            low_stock: parseInt(lowStock.rows[0].count, 10),
            near_expiry: parseInt(nearExpiry.rows[0].count, 10),
        },
        top_products_week: topProds.rows,
    });
});

// GET /api/analytics/inventory/reorder-suggestions
const reorderSuggestions = asyncHandler(async (req, res) => {
    const productStats = await getProductInventoryStats(req.business.id);
    res.json(buildReorderPayload(productStats, req.query));
});

// GET /api/analytics/inventory/stock-risk
const stockRisk = asyncHandler(async (req, res) => {
    const productStats = await getProductInventoryStats(req.business.id);
    res.json(buildStockRiskPayload(productStats, req.query));
});

// GET /api/analytics/inventory/expiry-risk
const expiryRisk = asyncHandler(async (req, res) => {
    const batchStats = await getBatchInventoryStats(req.business.id);
    res.json(buildExpiryRiskPayload(batchStats, req.query));
});

// GET /api/analytics/inventory/dead-stock
const deadStock = asyncHandler(async (req, res) => {
    const productStats = await getProductInventoryStats(req.business.id);
    res.json(buildDeadStockPayload(productStats, req.query));
});

// GET /api/analytics/inventory/opportunities
const opportunities = asyncHandler(async (req, res) => {
    const productStats = await getProductInventoryStats(req.business.id);
    res.json(buildOpportunityPayload(productStats, req.query));
});

// GET /api/analytics/inventory/intelligence
const inventoryIntelligence = asyncHandler(async (req, res) => {
    const businessId = req.business.id;

    const [productStats, batchStats] = await Promise.all([
        getProductInventoryStats(businessId),
        getBatchInventoryStats(businessId),
    ]);

    const reorder = buildReorderPayload(productStats, req.query);
    const stock = buildStockRiskPayload(productStats, req.query);
    const expiry = buildExpiryRiskPayload(batchStats, req.query);
    const dead = buildDeadStockPayload(productStats, req.query);
    const opportunity = buildOpportunityPayload(productStats, req.query);
    const markdowns = buildMarkdownSuggestions(productStats, req.query);

    res.json({
        generated_at: Date.now(),
        reorder,
        stock_risk: stock,
        expiry_risk: expiry,
        dead_stock: dead,
        opportunities: opportunity,
        markdowns,
    });
});

// GET /api/analytics/inventory/markdowns
const markdownSuggestions = asyncHandler(async (req, res) => {
    const productStats = await getProductInventoryStats(req.business.id);
    res.json(buildMarkdownSuggestions(productStats, req.query));
});

async function getProductInventoryStats(businessId) {
    const { rows } = await query(
        `WITH stock_by_product AS (
       SELECT
         st.product_id,
         COALESCE(SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END), 0) AS current_stock
       FROM stock_transactions st
       GROUP BY st.product_id
     ),
     sales_7d AS (
       SELECT
         st.product_id,
         COALESCE(SUM(st.quantity), 0) AS units_sold_7d
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       WHERE p.business_id = $1
         AND st.type = 'sale'
         AND st.txn_at >= $2
       GROUP BY st.product_id
     ),
     sales_30d AS (
       SELECT
         st.product_id,
         COALESCE(SUM(st.quantity), 0) AS units_sold_30d
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       WHERE p.business_id = $1
         AND st.type = 'sale'
         AND st.txn_at >= $3
       GROUP BY st.product_id
     ),
     sales_prev_30d AS (
       SELECT
         st.product_id,
         COALESCE(SUM(st.quantity), 0) AS units_sold_prev_30d
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       WHERE p.business_id = $1
         AND st.type = 'sale'
         AND st.txn_at >= $4
         AND st.txn_at < $3
       GROUP BY st.product_id
     ),
     last_sale AS (
       SELECT
         st.product_id,
         MAX(st.txn_at) AS last_sale_at
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       WHERE p.business_id = $1
         AND st.type = 'sale'
       GROUP BY st.product_id
     ),
     batch_stock AS (
       SELECT
         sb.id,
         sb.product_id,
         sb.cost_price,
         sb.expiry_date,
         GREATEST(COALESCE(SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END), 0), 0) AS remaining_units
       FROM stock_batches sb
       LEFT JOIN stock_transactions st ON st.batch_id = sb.id
       GROUP BY sb.id, sb.product_id, sb.cost_price, sb.expiry_date
     ),
     batch_summary AS (
       SELECT
         bs.product_id,
         COALESCE(SUM(bs.remaining_units * bs.cost_price), 0) AS stock_cost_value,
         COALESCE(SUM(bs.remaining_units), 0) AS batch_remaining_units,
         COUNT(*) FILTER (WHERE bs.remaining_units > 0) AS active_batch_count,
         MIN(bs.expiry_date) FILTER (WHERE bs.remaining_units > 0) AS nearest_expiry_date
       FROM batch_stock bs
       GROUP BY bs.product_id
     )
     SELECT
       p.id,
       p.name,
       p.category,
       p.unit,
       p.reorder_level,
       p.selling_price,
       COALESCE(stock_by_product.current_stock, 0) AS current_stock,
       COALESCE(sales_7d.units_sold_7d, 0) AS units_sold_7d,
       COALESCE(sales_30d.units_sold_30d, 0) AS units_sold_30d,
       COALESCE(sales_prev_30d.units_sold_prev_30d, 0) AS units_sold_prev_30d,
       last_sale.last_sale_at,
       COALESCE(batch_summary.stock_cost_value, 0) AS stock_cost_value,
       COALESCE(batch_summary.active_batch_count, 0) AS active_batch_count,
       batch_summary.nearest_expiry_date,
       CASE
         WHEN COALESCE(batch_summary.batch_remaining_units, 0) > 0
           THEN COALESCE(batch_summary.stock_cost_value, 0) / batch_summary.batch_remaining_units
         ELSE 0
       END AS estimated_cost_per_unit
     FROM products p
     LEFT JOIN stock_by_product ON stock_by_product.product_id = p.id
     LEFT JOIN sales_7d ON sales_7d.product_id = p.id
     LEFT JOIN sales_30d ON sales_30d.product_id = p.id
     LEFT JOIN sales_prev_30d ON sales_prev_30d.product_id = p.id
     LEFT JOIN last_sale ON last_sale.product_id = p.id
     LEFT JOIN batch_summary ON batch_summary.product_id = p.id
     WHERE p.business_id = $1 AND p.archived_at IS NULL`,
        [
            businessId,
            Date.now() - 7 * DAY_MS,
            Date.now() - 30 * DAY_MS,
            Date.now() - 60 * DAY_MS,
        ]
    );

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        category: row.category,
        unit: row.unit,
        reorder_level: toNumber(row.reorder_level),
        selling_price: toNumber(row.selling_price),
        current_stock: Math.max(0, toNumber(row.current_stock)),
        units_sold_7d: toNumber(row.units_sold_7d),
        units_sold_30d: toNumber(row.units_sold_30d),
        units_sold_prev_30d: toNumber(row.units_sold_prev_30d),
        last_sale_at: row.last_sale_at ? Number(row.last_sale_at) : null,
        stock_cost_value: toNumber(row.stock_cost_value),
        active_batch_count: toNumber(row.active_batch_count),
        nearest_expiry_date: row.nearest_expiry_date ? Number(row.nearest_expiry_date) : null,
        estimated_cost_per_unit: toNumber(row.estimated_cost_per_unit),
    }));
}

async function getBatchInventoryStats(businessId) {
    const { rows } = await query(
        `WITH batch_stock AS (
       SELECT
         sb.id AS batch_id,
         sb.product_id,
         sb.batch_no,
         sb.expiry_date,
         sb.cost_price,
         GREATEST(COALESCE(SUM(CASE WHEN st.type IN ('stock_in','return') THEN st.quantity ELSE -st.quantity END), 0), 0) AS remaining_units
       FROM stock_batches sb
       LEFT JOIN stock_transactions st ON st.batch_id = sb.id
       GROUP BY sb.id, sb.product_id, sb.batch_no, sb.expiry_date, sb.cost_price
     ),
     sales_30d AS (
       SELECT
         st.product_id,
         COALESCE(SUM(st.quantity), 0) AS units_sold_30d
       FROM stock_transactions st
       JOIN products p ON p.id = st.product_id
       WHERE p.business_id = $1
         AND st.type = 'sale'
         AND st.txn_at >= $2
       GROUP BY st.product_id
     )
     SELECT
       bs.batch_id,
       bs.product_id,
       p.name,
       p.category,
       p.selling_price,
       bs.batch_no,
       bs.expiry_date,
       bs.cost_price,
       bs.remaining_units,
       COALESCE(sales_30d.units_sold_30d, 0) / 30.0 AS avg_daily_sales
     FROM batch_stock bs
     JOIN products p ON p.id = bs.product_id
     LEFT JOIN sales_30d ON sales_30d.product_id = bs.product_id
     WHERE p.business_id = $1`,
        [businessId, Date.now() - 30 * DAY_MS]
    );

    return rows.map(row => ({
        batch_id: row.batch_id,
        product_id: row.product_id,
        name: row.name,
        category: row.category,
        selling_price: toNumber(row.selling_price),
        batch_no: row.batch_no,
        expiry_date: row.expiry_date == null ? null : Number(row.expiry_date),
        cost_price: toNumber(row.cost_price),
        remaining_units: Math.max(0, toNumber(row.remaining_units)),
        avg_daily_sales: toNumber(row.avg_daily_sales),
    }));
}

function buildReorderPayload(productStats, queryParams = {}) {
    const targetDays = Math.max(parseInt(queryParams.days, 10) || 14, 1);
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const urgencyFilter = queryParams.urgency || 'all';
    const categoryFilter = queryParams.category || 'all';
    const sort = queryParams.sort || 'urgency';

    let items = productStats.map(product => {
        const blendedDailySales = getBlendedDailySales(product);
        const daysOfCover = blendedDailySales > 0 ? product.current_stock / blendedDailySales : Infinity;
        const targetCoverDays = getTargetCoverDays(product, targetDays);
        const suggestedReorderQty = Math.max(0, Math.ceil(targetCoverDays * blendedDailySales - product.current_stock));
        const urgency = getUrgency(daysOfCover, product.current_stock);
        const avgCostPerUnit = product.current_stock > 0 ? product.stock_cost_value / product.current_stock : product.estimated_cost_per_unit;

        return {
            product_id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
            current_stock: round(product.current_stock),
            reorder_level: round(product.reorder_level),
            avg_daily_sales_7d: round(product.units_sold_7d / 7),
            avg_daily_sales_30d: round(product.units_sold_30d / 30),
            blended_daily_sales: round(blendedDailySales),
            days_of_cover: Number.isFinite(daysOfCover) ? round(daysOfCover) : null,
            target_cover_days: targetCoverDays,
            suggested_reorder_qty: suggestedReorderQty,
            estimated_reorder_cost: round(suggestedReorderQty * avgCostPerUnit),
            estimated_reorder_value: round(suggestedReorderQty * product.selling_price),
            urgency,
            reasons: buildReorderReasons(product, daysOfCover, blendedDailySales),
            recommended_action: getReorderAction(urgency, suggestedReorderQty),
        };
    });

    items = items.filter(item => item.suggested_reorder_qty > 0);
    items = filterCategory(items, categoryFilter);
    items = filterUrgency(items, urgencyFilter);
    items = sortReorderItems(items, sort).slice(0, limit);

    return {
        summary: {
            critical_count: items.filter(item => item.urgency === 'critical').length,
            high_count: items.filter(item => item.urgency === 'high').length,
            medium_count: items.filter(item => item.urgency === 'medium').length,
            estimated_purchase_value: round(items.reduce((sum, item) => sum + item.estimated_reorder_cost, 0)),
        },
        items,
    };
}

function buildStockRiskPayload(productStats, queryParams = {}) {
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const riskFilter = queryParams.risk || 'all';
    const windowDays = Math.max(parseInt(queryParams.window_days, 10) || 14, 1);

    let items = productStats.map(product => {
        const dailyDemand = getBlendedDailySales(product);
        const daysOfCover = dailyDemand > 0 ? product.current_stock / dailyDemand : Infinity;
        const riskBand = getRiskBand(daysOfCover);
        const predictedStockoutAt = Number.isFinite(daysOfCover) ? Date.now() + daysOfCover * DAY_MS : null;
        const estimatedRevenueRisk = Number.isFinite(daysOfCover) && daysOfCover <= windowDays
            ? round(Math.max(windowDays - daysOfCover, 0) * dailyDemand * product.selling_price)
            : 0;

        return {
            product_id: product.id,
            name: product.name,
            category: product.category,
            current_stock: round(product.current_stock),
            daily_demand: round(dailyDemand),
            days_of_cover: Number.isFinite(daysOfCover) ? round(daysOfCover) : null,
            predicted_stockout_at: predictedStockoutAt ? Math.round(predictedStockoutAt) : null,
            risk_band: riskBand,
            estimated_revenue_risk: estimatedRevenueRisk,
            recommended_action: getStockRiskAction(riskBand),
        };
    });

    items = items.filter(item => item.risk_band !== 'safe');
    items = filterUrgency(items, riskFilter, 'risk_band');
    items.sort((a, b) => urgencyRank(a.risk_band) - urgencyRank(b.risk_band) || a.days_of_cover - b.days_of_cover);
    items = items.slice(0, limit);

    return {
        summary: {
            stockout_3d: items.filter(item => item.days_of_cover !== null && item.days_of_cover <= 3).length,
            stockout_7d: items.filter(item => item.days_of_cover !== null && item.days_of_cover <= 7).length,
            stockout_14d: items.filter(item => item.days_of_cover !== null && item.days_of_cover <= 14).length,
            revenue_at_risk: round(items.reduce((sum, item) => sum + item.estimated_revenue_risk, 0)),
        },
        items,
    };
}

function buildExpiryRiskPayload(batchStats, queryParams = {}) {
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const riskFilter = queryParams.risk || 'all';
    const days = Math.max(parseInt(queryParams.days, 10) || 30, 1);

    let items = batchStats
        // Loose goods stocked without an expiry date can't be at expiry risk.
        .filter(batch => batch.expiry_date > 0)
        .map(batch => {
            const daysUntilExpiry = Math.floor((batch.expiry_date - Date.now()) / DAY_MS);
            const projectedSellableUnits = Math.max(0, batch.avg_daily_sales * Math.max(daysUntilExpiry, 0));
            const likelyUnsoldUnits = Math.max(0, batch.remaining_units - projectedSellableUnits);
            const riskBand = getExpiryRiskBand(daysUntilExpiry, likelyUnsoldUnits, batch.remaining_units);

            return {
                batch_id: batch.batch_id,
                product_id: batch.product_id,
                name: batch.name,
                category: batch.category,
                batch_no: batch.batch_no,
                remaining_units: round(batch.remaining_units),
                cost_price: round(batch.cost_price),
                selling_price: round(batch.selling_price),
                expiry_date: batch.expiry_date,
                days_until_expiry: daysUntilExpiry,
                avg_daily_sales: round(batch.avg_daily_sales),
                projected_sellable_units: round(projectedSellableUnits),
                likely_unsold_units: round(likelyUnsoldUnits),
                risk_band: riskBand,
                value_at_risk_cost: round(likelyUnsoldUnits * batch.cost_price),
                value_at_risk_sale: round(likelyUnsoldUnits * batch.selling_price),
                recommended_action: getExpiryAction(riskBand, daysUntilExpiry),
            };
        })
        .filter(item => item.remaining_units > 0 && item.days_until_expiry <= days && item.likely_unsold_units > 0);

    items = filterUrgency(items, riskFilter, 'risk_band');
    items.sort((a, b) => urgencyRank(a.risk_band) - urgencyRank(b.risk_band) || a.days_until_expiry - b.days_until_expiry);
    items = items.slice(0, limit);

    return {
        summary: {
            at_risk_batches: items.length,
            at_risk_units: round(items.reduce((sum, item) => sum + item.likely_unsold_units, 0)),
            value_at_risk_cost: round(items.reduce((sum, item) => sum + item.value_at_risk_cost, 0)),
            value_at_risk_sale: round(items.reduce((sum, item) => sum + item.value_at_risk_sale, 0)),
        },
        items,
    };
}

function buildDeadStockPayload(productStats, queryParams = {}) {
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const mode = queryParams.mode || 'all';
    const daysWithoutSale = Math.max(parseInt(queryParams.days_without_sale, 10) || 30, 1);

    let items = productStats.map(product => {
        const lastSaleAt = product.last_sale_at ? Number(product.last_sale_at) : null;
        const daysSinceLastSale = lastSaleAt ? Math.floor((Date.now() - lastSaleAt) / DAY_MS) : null;
        const status = getDeadStockStatus(product, daysSinceLastSale, daysWithoutSale);

        return {
            product_id: product.id,
            name: product.name,
            category: product.category,
            current_stock: round(product.current_stock),
            last_sale_at: lastSaleAt,
            days_since_last_sale: daysSinceLastSale,
            units_sold_7d: round(product.units_sold_7d),
            units_sold_30d: round(product.units_sold_30d),
            stock_cost_value: round(product.stock_cost_value),
            stock_sale_value: round(product.current_stock * product.selling_price),
            status,
            recommended_action: getDeadStockAction(status),
        };
    });

    items = items.filter(item => item.current_stock > 0 && item.status !== 'healthy');
    if (mode !== 'all') {
        items = items.filter(item => item.status === (mode === 'dead' ? 'dead_stock' : 'slow_mover'));
    }
    items.sort((a, b) => b.stock_cost_value - a.stock_cost_value || (b.days_since_last_sale || 0) - (a.days_since_last_sale || 0));
    items = items.slice(0, limit);

    return {
        summary: {
            dead_stock_count: items.filter(item => item.status === 'dead_stock').length,
            slow_mover_count: items.filter(item => item.status === 'slow_mover').length,
            blocked_cost_value: round(items.reduce((sum, item) => sum + item.stock_cost_value, 0)),
            blocked_sale_value: round(items.reduce((sum, item) => sum + item.stock_sale_value, 0)),
        },
        items,
    };
}

// Suggest a discount for slow/dead stock that STILL clears a minimum margin over
// cost — so the shopkeeper moves stale inventory without ever selling at a loss.
function buildMarkdownSuggestions(productStats, queryParams = {}) {
    const limit = Math.min(parseInt(queryParams.limit, 10) || 20, 100);
    const minMarginPct = Math.max(parseInt(queryParams.min_margin, 10) || 10, 0);
    const daysWithoutSale = Math.max(parseInt(queryParams.days_without_sale, 10) || 30, 1);

    let items = productStats.map(product => {
        // Prefer batch-derived cost; fall back to average stock cost value.
        const cost = product.estimated_cost_per_unit > 0
            ? product.estimated_cost_per_unit
            : (product.current_stock > 0 ? product.stock_cost_value / product.current_stock : 0);
        const sellingPrice = product.selling_price;
        const lastSaleAt = product.last_sale_at ? Number(product.last_sale_at) : null;
        const daysSinceLastSale = lastSaleAt ? Math.floor((Date.now() - lastSaleAt) / DAY_MS) : null;
        const status = getDeadStockStatus(product, daysSinceLastSale, daysWithoutSale);

        if (product.current_stock <= 0) return null;      // nothing to clear
        if (status === 'healthy') return null;             // only slow movers / dead stock
        if (cost <= 0 || sellingPrice <= cost) return null; // no cost data, or already at/below cost

        const floorPrice = cost * (1 + minMarginPct / 100);            // lowest still-profitable price
        const targetDiscountPct = status === 'dead_stock' ? 25 : 15;   // push harder on dead stock
        const suggestedPrice = Math.max(floorPrice, sellingPrice * (1 - targetDiscountPct / 100));
        const discountPct = round(((sellingPrice - suggestedPrice) / sellingPrice) * 100);
        if (discountPct < 1) return null;                  // no room to discount and stay profitable

        const marginPctAfter = round(((suggestedPrice - cost) / suggestedPrice) * 100);

        return {
            product_id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
            current_stock: round(product.current_stock),
            cost_per_unit: round(cost),
            selling_price: round(sellingPrice),
            suggested_price: round(suggestedPrice),
            discount_pct: discountPct,
            margin_pct_after: marginPctAfter,
            status,
            units_sold_30d: round(product.units_sold_30d),
            days_since_last_sale: daysSinceLastSale,
            blocked_cost_value: round(product.current_stock * cost),
            recommended_action: `Discount to ₹${round(suggestedPrice)} (${discountPct}% off) — keeps ${marginPctAfter}% margin`,
        };
    }).filter(Boolean);

    items.sort((a, b) => b.blocked_cost_value - a.blocked_cost_value);
    items = items.slice(0, limit);

    return {
        summary: {
            markdown_count: items.length,
            blocked_cost_value: round(items.reduce((sum, item) => sum + item.blocked_cost_value, 0)),
            potential_recovery_value: round(items.reduce((sum, item) => sum + item.current_stock * item.suggested_price, 0)),
        },
        items,
    };
}

function buildOpportunityPayload(productStats, queryParams = {}) {
    const limit = Math.min(parseInt(queryParams.limit, 10) || 10, 50);
    const seasonal = queryParams.seasonal !== 'false';
    const categoryFilter = queryParams.category || 'all';

    const byCategory = new Map();
    for (const product of productStats) {
        const current = byCategory.get(product.category) || {
            category: product.category,
            sku_count: 0,
            units_30d: 0,
            units_prev_30d: 0,
            revenue_30d: 0,
            avg_days_of_cover: 0,
            fast_movers: 0,
        };

        const blendedDailySales = getBlendedDailySales(product);
        const daysOfCover = blendedDailySales > 0 ? product.current_stock / blendedDailySales : 30;

        current.sku_count += 1;
        current.units_30d += product.units_sold_30d;
        current.units_prev_30d += product.units_sold_prev_30d;
        current.revenue_30d += product.units_sold_30d * product.selling_price;
        current.avg_days_of_cover += daysOfCover;
        if (product.units_sold_30d >= 20) current.fast_movers += 1;

        byCategory.set(product.category, current);
    }

    const categoryStats = Array.from(byCategory.values()).map(category => ({
        ...category,
        avg_days_of_cover: category.sku_count > 0 ? round(category.avg_days_of_cover / category.sku_count) : 0,
        growth_pct: category.units_prev_30d > 0
            ? round(((category.units_30d - category.units_prev_30d) / category.units_prev_30d) * 100)
            : (category.units_30d > 0 ? 100 : 0),
    }));

    let items = [];

    for (const category of categoryStats) {
        if (categoryFilter !== 'all' && category.category !== categoryFilter) continue;

        if (category.units_30d >= 20 && category.sku_count <= 2) {
            items.push({
                type: 'category_gap',
                category: category.category,
                title: `Expand ${category.category.toLowerCase()} assortment`,
                confidence: category.growth_pct >= 20 ? 'high' : 'medium',
                supporting_metrics: {
                    category_growth_pct: category.growth_pct,
                    sku_count: category.sku_count,
                    fast_movers: category.fast_movers,
                },
                explanation: `${category.category} is moving well, but SKU variety is still thin for current demand.`,
                recommended_action: `Add 2 to 3 more fast-moving ${category.category.toLowerCase()} items.`,
            });
        }

        if (category.avg_days_of_cover < 7 && category.units_30d > 25) {
            items.push({
                type: 'stock_pressure',
                category: category.category,
                title: `${category.category} needs stronger depth`,
                confidence: 'medium',
                supporting_metrics: {
                    avg_days_of_cover: category.avg_days_of_cover,
                    category_units_30d: round(category.units_30d),
                },
                explanation: `${category.category} is selling quickly and average stock cover is low across the category.`,
                recommended_action: `Increase depth in ${category.category.toLowerCase()} before stock pressure hurts sales.`,
            });
        }
    }

    const topCategory = categoryStats.slice().sort((a, b) => b.units_30d - a.units_30d)[0];
    if (topCategory) {
        const complementaryCategory = getComplementaryCategory(topCategory.category);
        const complementaryStats = categoryStats.find(item => item.category === complementaryCategory);
        if (complementaryCategory && (!complementaryStats || complementaryStats.sku_count <= 1)) {
            items.push({
                type: 'basket_expansion',
                category: complementaryCategory,
                title: `Add more ${complementaryCategory.toLowerCase()} options`,
                confidence: 'medium',
                supporting_metrics: {
                    top_related_category: topCategory.category,
                    top_related_units_30d: round(topCategory.units_30d),
                    sku_count: complementaryStats ? complementaryStats.sku_count : 0,
                },
                explanation: `${topCategory.category} is a strong basket driver, but the complementary ${complementaryCategory.toLowerCase()} range is limited.`,
                recommended_action: `Add 1 to 3 ${complementaryCategory.toLowerCase()} products to increase basket size.`,
            });
        }
    }

    if (seasonal) {
        const seasonalSuggestion = buildSeasonalOpportunity(categoryStats);
        if (seasonalSuggestion) items.push(seasonalSuggestion);
    }

    items = dedupeOpportunities(items).slice(0, limit);

    return {
        summary: {
            opportunity_count: items.length,
            fast_growing_categories: categoryStats.filter(item => item.growth_pct >= 20).length,
        },
        items,
    };
}

function getBlendedDailySales(product) {
    const daily7 = product.units_sold_7d / 7;
    const daily30 = product.units_sold_30d / 30;
    return 0.7 * daily7 + 0.3 * daily30;
}

function getTargetCoverDays(product, baseTargetDays) {
    const daily30 = product.units_sold_30d / 30;
    if (daily30 >= 2) return Math.max(7, baseTargetDays - 4);
    if (daily30 >= 0.75) return baseTargetDays;
    return Math.max(baseTargetDays, 21);
}

function getUrgency(daysOfCover, currentStock) {
    if (currentStock <= 0) return 'critical';
    if (!Number.isFinite(daysOfCover)) return 'medium';
    if (daysOfCover <= 3) return 'critical';
    if (daysOfCover <= 7) return 'high';
    if (daysOfCover <= 14) return 'medium';
    return 'safe';
}

function getRiskBand(daysOfCover) {
    if (!Number.isFinite(daysOfCover)) return 'safe';
    if (daysOfCover <= 3) return 'critical';
    if (daysOfCover <= 7) return 'high';
    if (daysOfCover <= 14) return 'medium';
    return 'safe';
}

function getExpiryRiskBand(daysUntilExpiry, likelyUnsoldUnits, remainingUnits) {
    if (daysUntilExpiry < 0) return 'critical';
    if (daysUntilExpiry <= 3) return 'high';
    if (remainingUnits > 0 && likelyUnsoldUnits / remainingUnits >= 0.5) return 'high';
    return 'medium';
}

function getDeadStockStatus(product, daysSinceLastSale, threshold) {
    if (product.current_stock <= 0) return 'healthy';
    if (daysSinceLastSale === null || daysSinceLastSale >= threshold) return 'dead_stock';
    if (product.units_sold_30d <= Math.max(1, product.current_stock * 0.2)) return 'slow_mover';
    return 'healthy';
}

function buildReorderReasons(product, daysOfCover, blendedDailySales) {
    const reasons = [];
    if (product.current_stock <= product.reorder_level) reasons.push('Below reorder level');
    if (Number.isFinite(daysOfCover) && daysOfCover <= 7) reasons.push(`Only ${round(daysOfCover)} days of stock left`);
    if (product.units_sold_7d > product.units_sold_30d / 4) reasons.push('Recent demand is stronger than monthly average');
    if (product.current_stock <= 0 && blendedDailySales > 0) reasons.push('Currently out of stock');
    return reasons.length > 0 ? reasons : ['Maintain closer watch on this product'];
}

function getReorderAction(urgency, reorderQty) {
    if (reorderQty <= 0) return 'No action needed';
    if (urgency === 'critical') return 'Reorder immediately';
    if (urgency === 'high') return 'Raise purchase order within 2 days';
    if (urgency === 'medium') return 'Review and reorder in the next cycle';
    return 'Monitor demand before reordering';
}

function getStockRiskAction(riskBand) {
    if (riskBand === 'critical') return 'Escalate replenishment today';
    if (riskBand === 'high') return 'Reorder within 2 days';
    if (riskBand === 'medium') return 'Add to next stock review';
    return 'Stock position is healthy';
}

function getExpiryAction(riskBand, daysUntilExpiry) {
    if (daysUntilExpiry < 0) return 'Review batch immediately and record wastage if needed';
    if (riskBand === 'high') return 'Discount, bundle, or prioritize clearance now';
    return 'Promote this batch before expiry pressure increases';
}

function getDeadStockAction(status) {
    if (status === 'dead_stock') return 'Pause reordering and clear old inventory';
    if (status === 'slow_mover') return 'Reduce reorder quantity and consider an offer';
    return 'No action needed';
}

function getComplementaryCategory(category) {
    const map = {
        Snack: 'Beverage',
        Beverage: 'Snack',
        Grocery: 'Personal Care',
        Dairy: 'Snack',
    };
    return map[category] || null;
}

function buildSeasonalOpportunity(categoryStats) {
    const month = new Date().getMonth();
    const season = month >= 2 && month <= 5 ? 'summer' : month >= 6 && month <= 8 ? 'monsoon' : 'general';

    if (season === 'summer') {
        const beverage = categoryStats.find(item => item.category === 'Beverage');
        if (!beverage || beverage.sku_count <= 2) {
            return {
                type: 'seasonal_opportunity',
                category: 'Beverage',
                title: 'Summer demand signal',
                confidence: 'medium',
                supporting_metrics: {
                    season,
                    sku_count: beverage ? beverage.sku_count : 0,
                    category_units_30d: beverage ? round(beverage.units_30d) : 0,
                },
                explanation: 'Current season supports stronger demand for juices, cold drinks, and hydration-led products.',
                recommended_action: 'Increase beverage assortment for the summer demand window.',
            };
        }
    }

    if (season === 'monsoon') {
        return {
            type: 'seasonal_opportunity',
            category: 'Grocery',
            title: 'Monsoon pantry opportunity',
            confidence: 'low',
            supporting_metrics: { season },
            explanation: 'Monsoon periods often favor warm beverage and pantry staples with repeat demand.',
            recommended_action: 'Review tea, soup, and comfort staple assortment for the season.',
        };
    }

    return null;
}

function dedupeOpportunities(items) {
    const seen = new Set();
    return items.filter(item => {
        const key = `${item.type}:${item.category}:${item.title}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function sortReorderItems(items, sort) {
    if (sort === 'days_of_cover') {
        return items.sort((a, b) => (a.days_of_cover ?? Infinity) - (b.days_of_cover ?? Infinity));
    }
    if (sort === 'revenue_risk') {
        return items.sort((a, b) => b.estimated_reorder_value - a.estimated_reorder_value);
    }
    return items.sort((a, b) => urgencyRank(a.urgency) - urgencyRank(b.urgency) || (a.days_of_cover ?? Infinity) - (b.days_of_cover ?? Infinity));
}

function filterCategory(items, category) {
    if (!category || category === 'all') return items;
    return items.filter(item => item.category === category);
}

function filterUrgency(items, value, field = 'urgency') {
    if (!value || value === 'all') return items;
    return items.filter(item => item[field] === value);
}

function urgencyRank(value) {
    if (value === 'critical') return 0;
    if (value === 'high') return 1;
    if (value === 'medium') return 2;
    return 3;
}

function toNumber(value) {
    return Number(value || 0);
}

function round(value) {
    return Math.round(Number(value || 0) * 100) / 100;
}

module.exports = {
    sales,
    topProducts,
    customerStats,
    dashboard,
    reorderSuggestions,
    stockRisk,
    expiryRisk,
    deadStock,
    opportunities,
    markdownSuggestions,
    inventoryIntelligence,
};
