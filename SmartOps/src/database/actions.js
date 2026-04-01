import database from './index';
import { Q } from '@nozbe/watermelondb';

const PENDING = 'pending';

// ── Products ──────────────────────────────────────────────────────────────────

export async function registerProduct({
    name, category, barcode, unit, reorderLevel,
    scheduleH, sellingPrice, businessId, brand,
}) {
    return database.write(async () => {
        return database.get('products').create(p => {
            p.name = name;
            p.category = category;
            p.barcode = barcode || '';
            p.brand = brand || '';
            p.unit = unit;
            p.reorderLevel = reorderLevel ?? 5;
            p.scheduleH = scheduleH ?? false;
            p.sellingPrice = sellingPrice ?? 0;
            p.businessId = businessId;
            p.syncStatus = PENDING;
            p.updatedAt = Date.now();
        });
    });
}

export async function getProductByBarcode(barcode) {
    if (!barcode) return null;
    const rows = await database.get('products')
        .query(Q.where('barcode', barcode))
        .fetch();
    return rows[0] ?? null;
}

export async function getAllProducts(businessId) {
    return database.get('products')
        .query(Q.where('business_id', businessId))
        .fetch();
}

// ── Stock In ──────────────────────────────────────────────────────────────────

export async function recordStockIn({ productId, quantity, batchNo, expiryDate, costPrice }) {
    return database.write(async () => {
        const batch = await database.get('stock_batches').create(b => {
            b.productId = productId;
            b.quantity = quantity;
            b.batchNo = batchNo;
            b.expiryDate = expiryDate;
            b.costPrice = costPrice || 0;
            b.syncStatus = PENDING;
            b.createdAt = Date.now();
        });

        await database.get('stock_transactions').create(t => {
            t.productId = productId;
            t.batchId = batch.id;
            t.type = 'stock_in';
            t.quantity = quantity;
            t.txnAt = Date.now();
            t.syncStatus = PENDING;
        });

        return batch;
    });
}

// ── Sales ─────────────────────────────────────────────────────────────────────
// Uses a single database.write() — atomic, safe for multi-user concurrent orders
// Each order gets its own UUID from WatermelonDB — no conflicts between devices

export async function recordSale({ businessId, customerId, items, paymentMode }) {
    return database.write(async () => {
        const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
        const now = Date.now();

        const order = await database.get('sale_orders').create(o => {
            o.businessId = businessId;
            o.customerId = customerId || null;
            o.totalAmount = total;
            o.paymentMode = paymentMode || 'cash';
            o.saleAt = now;
            o.syncStatus = PENDING;
        });

        for (const item of items) {
            await database.get('sale_items').create(si => {
                si.orderId = order.id;
                si.productId = item.productId;
                si.batchId = item.batchId;
                si.quantity = item.quantity;
                si.unitPrice = item.unitPrice;
            });

            await database.get('stock_transactions').create(t => {
                t.productId = item.productId;
                t.batchId = item.batchId;
                t.type = 'sale';
                t.quantity = item.quantity;
                t.txnAt = now;
                t.syncStatus = PENDING;
            });
        }

        if (customerId) {
            const customer = await database.get('customers').find(customerId);
            await customer.update(c => {
                c.lastPurchaseAt = now;
                c.syncStatus = PENDING;
            });
        }

        return order;
    });
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function upsertCustomer({ businessId, name, phone }) {
    return database.write(async () => {
        const existing = await database.get('customers')
            .query(Q.where('phone', phone), Q.where('business_id', businessId))
            .fetch();

        if (existing.length > 0) return existing[0];

        return database.get('customers').create(c => {
            c.businessId = businessId;
            c.name = name || phone;
            c.phone = phone;
            c.segment = 'new';
            c.lastPurchaseAt = Date.now();
            c.syncStatus = PENDING;
        });
    });
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export async function getLowStockProducts(businessId = 'default') {
    const products = await database.get('products')
        .query(Q.where('business_id', businessId))
        .fetch();

    const results = [];
    for (const p of products) {
        const stock = await p.currentStock();
        if (stock <= p.reorderLevel) results.push({ product: p, stock });
    }
    return results.sort((a, b) => a.stock - b.stock);
}

export async function getNearExpiryBatches(days = 30) {
    const cutoff = Date.now() + days * 86400000;
    return database.get('stock_batches')
        .query(Q.where('expiry_date', Q.lte(cutoff)))
        .fetch();
}

export async function getTodaySales(businessId = 'default') {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await database.get('sale_orders')
        .query(
            Q.where('business_id', businessId),
            Q.where('sale_at', Q.gte(startOfDay.getTime()))
        )
        .fetch();

    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    return { count: orders.length, total };
}