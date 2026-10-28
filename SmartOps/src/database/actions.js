import database from './index';
import { Q } from '@nozbe/watermelondb';
import { getBusinessId, syncAfterWrite } from '../sync/syncEngine';

const PENDING = 'pending';

// Soft deletes: archived products/customers/suppliers and voided sales stay in
// the DB (history, bills and khata still resolve them) but drop out of lists.
// Filtered in JS rather than Q.where(col, null) — rows written before schema
// v6 have no value for the column at all.
const active = rows => rows.filter(r => !r.archivedAt);
const notVoided = orders => orders.filter(o => !o.voidedAt);

// The khata ledger only has credit_sale/repayment, so voiding a credit bill is
// booked as a repayment carrying this note (and isn't counted as cash in).
export const VOID_NOTE = 'Bill voided';

// ── Products ──────────────────────────────────────────────────────────────────

export async function registerProduct({
    name, category, barcode, unit, reorderLevel,
    scheduleH, sellingPrice, businessId, brand,
}) {
    const bId = businessId || getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('products').create(p => {
            p.name = name;
            p.category = category;
            p.barcode = barcode || '';
            p.brand = brand || '';
            p.unit = unit;
            p.reorderLevel = reorderLevel ?? 5;
            p.scheduleH = scheduleH ?? false;
            p.sellingPrice = sellingPrice ?? 0;
            p.businessId = bId;
            p.syncStatus = PENDING;
            p.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

export async function updateProduct({ productId, sellingPrice, reorderLevel }) {
    const now = Date.now();

    const result = await database.write(async () => {
        const product = await database.get('products').find(productId);
        return product.update(p => {
            if (sellingPrice !== undefined) p.sellingPrice = sellingPrice;
            if (reorderLevel !== undefined) p.reorderLevel = reorderLevel;
            p.syncStatus = PENDING;
            p.updatedAt = now;
        });
    });

    syncAfterWrite();   // this write lands in the sync `updated` bucket
    return result;
}

export async function getProductByBarcode(barcode) {
    if (!barcode) return null;
    const rows = await database.get('products')
        .query(Q.where('barcode', barcode))
        .fetch();
    return rows[0] ?? null;
}

export async function getProductById(id) {
    if (!id) return null;
    try {
        return await database.get('products').find(id);
    } catch {
        return null;   // find() throws if the id doesn't exist
    }
}

export async function getAllProducts({ includeArchived = false } = {}) {
    const bId = getBusinessId();
    const rows = await database.get('products')
        .query(Q.where('business_id', bId))
        .fetch();
    return includeArchived ? rows : active(rows);
}

// Discontinued items leave Inventory, Alerts, Reorder and the sale/PO pickers;
// pass archived=false to bring one back.
export async function setProductArchived(productId, archived) {
    const now = Date.now();
    const result = await database.write(async () => {
        const product = await database.get('products').find(productId);
        return product.update(p => {
            p.archivedAt = archived ? now : null;
            p.syncStatus = PENDING;
            p.updatedAt = now;
        });
    });
    syncAfterWrite();
    return result;
}

// ── Stock In ──────────────────────────────────────────────────────────────────

export async function recordStockIn({ productId, quantity, batchNo, expiryDate, costPrice, supplierId }) {
    const now = Date.now();

    const result = await database.write(async () => {
        const batch = await database.get('stock_batches').create(b => {
            b.productId = productId;
            b.quantity = quantity;
            b.batchNo = batchNo || null;         // optional for loose goods
            b.expiryDate = expiryDate || null;
            b.costPrice = costPrice || 0;
            b.supplierId = supplierId || null;
            b.syncStatus = PENDING;
            b.createdAt = now;
            b.updatedAt = now;
        });

        await database.get('stock_transactions').create(t => {
            t.productId = productId;
            t.batchId = batch.id;
            t.type = 'stock_in';
            t.quantity = quantity;
            t.txnAt = now;
            t.syncStatus = PENDING;
            t.updatedAt = now;
        });

        return batch;
    });

    syncAfterWrite();
    return result;
}

// ── Wastage / write-off ─────────────────────────────────────────────────────────
// Records a 'wastage' transaction against a batch. Because stock is derived from
// the transaction ledger (stock_in/return add, everything else subtracts), this
// immediately removes the written-off units from available stock — no separate
// stock column to keep in sync.
export async function recordWastage({ productId, batchId, quantity }) {
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('stock_transactions').create(t => {
            t.productId = productId;
            t.batchId = batchId;
            t.type = 'wastage';
            t.quantity = quantity;
            t.txnAt = now;
            t.syncStatus = PENDING;
            t.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

// ── Sales ─────────────────────────────────────────────────────────────────────

export async function recordSale({ customerId, items, paymentMode }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

        const order = await database.get('sale_orders').create(o => {
            o.businessId = bId;
            o.customerId = customerId || null;
            o.totalAmount = total;
            o.paymentMode = paymentMode || 'cash';
            o.saleAt = now;
            o.syncStatus = PENDING;
            o.updatedAt = now;
        });

        for (const item of items) {
            await database.get('sale_items').create(si => {
                si.orderId = order.id;
                si.productId = item.productId;
                si.batchId = item.batchId;
                si.quantity = item.quantity;
                si.unitPrice = item.unitPrice;
                si.updatedAt = now;
            });

            await database.get('stock_transactions').create(t => {
                t.productId = item.productId;
                t.batchId = item.batchId;
                t.type = 'sale';
                t.quantity = item.quantity;
                t.txnAt = now;
                t.syncStatus = PENDING;
                t.updatedAt = now;
            });
        }

        // Credit ("khata") sale — book the receivable in the same transaction as
        // the order, so the sale and the debt can never diverge. Requires a
        // customer to attribute the debt to.
        if (paymentMode === 'credit' && customerId) {
            await database.get('ledger_entries').create(e => {
                e.businessId = bId;
                e.customerId = customerId;
                e.orderId = order.id;
                e.type = 'credit_sale';
                e.amount = total;
                e.note = '';
                e.entryAt = now;
                e.syncStatus = PENDING;
                e.updatedAt = now;
            });
        }

        if (customerId) {
            const customer = await database.get('customers').find(customerId);
            await customer.update(c => {
                c.lastPurchaseAt = now;
                c.syncStatus = PENDING;
                c.updatedAt = now;
            });
        }

        return order;
    });

    syncAfterWrite();
    return result;
}

// Undo a wrong bill without deleting it: the order is stamped voided_at and
// stays in Records, every item goes back on its batch as a 'return'
// transaction, and a credit sale gets a matching khata entry so the customer no
// longer owes it.
export async function voidSale(orderId) {
    const bId = getBusinessId();
    const now = Date.now();

    await database.write(async () => {
        const order = await database.get('sale_orders').find(orderId);
        if (order.voidedAt) return;

        const items = await database.get('sale_items')
            .query(Q.where('order_id', orderId))
            .fetch();
        for (const item of items) {
            await database.get('stock_transactions').create(t => {
                t.productId = item.productId;
                t.batchId = item.batchId;
                t.type = 'return';
                t.quantity = item.quantity;
                t.txnAt = now;
                t.syncStatus = PENDING;
                t.updatedAt = now;
            });
        }

        if (order.paymentMode === 'credit' && order.customerId) {
            await database.get('ledger_entries').create(e => {
                e.businessId = bId;
                e.customerId = order.customerId;
                e.orderId = order.id;
                e.type = 'repayment';
                e.amount = order.totalAmount;
                e.note = VOID_NOTE;
                e.entryAt = now;
                e.syncStatus = PENDING;
                e.updatedAt = now;
            });
        }

        await order.update(o => {
            o.voidedAt = now;
            o.syncStatus = PENDING;
            o.updatedAt = now;
        });
    });

    syncAfterWrite();
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function upsertCustomer({ name, phone }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        const existing = await database.get('customers')
            .query(Q.where('phone', phone), Q.where('business_id', bId))
            .fetch();

        if (existing.length > 0) return existing[0];

        return database.get('customers').create(c => {
            c.businessId = bId;
            c.name = name || phone;
            c.phone = phone;
            c.segment = 'new';
            c.lastPurchaseAt = now;
            c.syncStatus = PENDING;
            c.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

// Name-first customer lookup for order entry: search local customers by name,
// phone, or address substring (case-insensitive). Small per-shop dataset, so a
// full fetch + in-memory filter is simpler and safer than building LIKE-pattern
// queries — no wildcard-escaping edge cases to get wrong.
export async function searchCustomers(query) {
    const bId = getBusinessId();
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const all = active(await database.get('customers')
        .query(Q.where('business_id', bId))
        .fetch());

    return all
        .filter(c =>
            c.name?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q)
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .slice(0, 8);
}

// Explicit "this is a genuinely new person" create — used once the search above
// has already given the shopkeeper a chance to pick an existing match instead.
// Unlike upsertCustomer, this never dedupes by phone: the dedup decision already
// happened in the search UI.
export async function createCustomer({ name, phone, address }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('customers').create(c => {
            c.businessId = bId;
            c.name = name;
            c.phone = phone || null;
            c.address = address || null;
            c.segment = 'new';
            c.lastPurchaseAt = null;
            c.syncStatus = PENDING;
            c.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

export async function updateCustomerDetails({ customerId, name, phone, address }) {
    const now = Date.now();

    const result = await database.write(async () => {
        const customer = await database.get('customers').find(customerId);
        return customer.update(c => {
            if (name !== undefined) c.name = name;
            if (phone !== undefined) c.phone = phone || null;
            if (address !== undefined) c.address = address || null;
            c.syncStatus = PENDING;
            c.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

// Full customer list for the Customer Directory screen, sorted by name.
export async function getAllCustomersDirectory({ includeArchived = false } = {}) {
    const bId = getBusinessId();
    const rows = await database.get('customers')
        .query(Q.where('business_id', bId))
        .fetch();
    return (includeArchived ? rows : active(rows))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

// Active customers with the same name (ignoring case/spacing) or the same
// phone — shown as "already exists?" before a new one is added.
export async function findPossibleDuplicates({ name, phone, excludeId }) {
    const bId = getBusinessId();
    const squash = s => (s || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const n = squash(name);
    const digits = (phone || '').replace(/\D/g, '');
    const rows = active(await database.get('customers')
        .query(Q.where('business_id', bId))
        .fetch());
    return rows.filter(c => c.id !== excludeId && (
        (n && squash(c.name) === n) ||
        (digits.length === 10 && (c.phone || '').replace(/\D/g, '') === digits)
    ));
}

// Hide a customer (duplicate, moved away). Refused while they still owe money,
// otherwise their khata would silently drop off the Khata tab.
export async function setCustomerArchived(customerId, archived) {
    if (archived && (await getCustomerBalance(customerId)) > 0.005) {
        throw Object.assign(new Error('Customer has an outstanding khata balance'), { code: 'HAS_BALANCE' });
    }
    const now = Date.now();
    const result = await database.write(async () => {
        const customer = await database.get('customers').find(customerId);
        return customer.update(c => {
            c.archivedAt = archived ? now : null;
            c.syncStatus = PENDING;
            c.updatedAt = now;
        });
    });
    syncAfterWrite();
    return result;
}

// Lifetime order count + total spend for a customer's directory profile.
export async function getCustomerOrderSummary(customerId) {
    const orders = notVoided(await database.get('sale_orders')
        .query(Q.where('customer_id', customerId))
        .fetch());
    return {
        orderCount: orders.length,
        totalSpend: orders.reduce((sum, o) => sum + o.totalAmount, 0),
    };
}

// ── Khata / Credit Ledger ───────────────────────────────────────────────────────
// A customer's outstanding balance is DERIVED from the append-only ledger:
//   balance = Σ credit_sale.amount − Σ repayment.amount   (positive ⇒ they owe us)

export async function recordRepayment({ customerId, amount, note }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('ledger_entries').create(e => {
            e.businessId = bId;
            e.customerId = customerId;
            e.orderId = null;               // repayments aren't tied to a single order
            e.type = 'repayment';
            e.amount = amount;
            e.note = note || '';
            e.entryAt = now;
            e.syncStatus = PENDING;
            e.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

export async function getCustomerBalance(customerId) {
    const entries = await database.get('ledger_entries')
        .query(Q.where('customer_id', customerId))
        .fetch();
    return entries.reduce((bal, e) => bal + e.signedAmount, 0);
}

export async function getCustomersByIds(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (unique.length === 0) return new Map();
    const customers = await database.get('customers')
        .query(Q.where('id', Q.oneOf(unique)))
        .fetch();
    return new Map(customers.map(c => [c.id, c]));
}

// All customers with a positive outstanding balance, largest first.
// Two batched queries total, regardless of how many customers/entries exist.
export async function getOutstandingCustomers() {
    const bId = getBusinessId();
    const entries = await database.get('ledger_entries')
        .query(Q.where('business_id', bId))
        .fetch();
    if (entries.length === 0) return [];

    const balanceByCustomer = {};
    for (const e of entries) {
        balanceByCustomer[e.customerId] = (balanceByCustomer[e.customerId] || 0) + e.signedAmount;
    }

    // Guard against floating-point dust from NUMERIC round-trips (e.g. 0.0000001).
    const owing = Object.entries(balanceByCustomer).filter(([, bal]) => bal > 0.005);
    if (owing.length === 0) return [];

    const customerMap = await getCustomersByIds(owing.map(([id]) => id));
    return owing
        .map(([id, balance]) => ({ customer: customerMap.get(id), balance }))
        .filter(row => row.customer)
        .sort((a, b) => b.balance - a.balance);
}

// Customers who once had khata but owe nothing now, so their history is still
// reachable from the Khata tab.
export async function getSettledKhataCustomers() {
    const bId = getBusinessId();
    const entries = await database.get('ledger_entries')
        .query(Q.where('business_id', bId))
        .fetch();
    const balanceByCustomer = {};
    for (const e of entries) {
        balanceByCustomer[e.customerId] = (balanceByCustomer[e.customerId] || 0) + e.signedAmount;
    }
    const settled = Object.entries(balanceByCustomer).filter(([, bal]) => bal <= 0.005);
    if (settled.length === 0) return [];
    const customerMap = await getCustomersByIds(settled.map(([id]) => id));
    return settled
        .map(([id]) => ({ customer: customerMap.get(id), balance: 0 }))
        .filter(row => row.customer)
        .sort((a, b) => (a.customer.name || '').localeCompare(b.customer.name || ''));
}

export async function getCustomerByPhone(phone) {
    const bId = getBusinessId();
    if (!phone) return null;
    const rows = await database.get('customers')
        .query(Q.where('phone', phone), Q.where('business_id', bId))
        .fetch();
    return rows[0] ?? null;
}

// Full ledger history for one customer (newest first) plus the derived balance.
export async function getCustomerLedger(customerId) {
    const entries = await database.get('ledger_entries')
        .query(Q.where('customer_id', customerId), Q.sortBy('entry_at', Q.desc))
        .fetch();
    const balance = entries.reduce((bal, e) => bal + e.signedAmount, 0);
    return { entries, balance };
}

// ── Analytics ─────────────────────────────────────────────────────────────────

// Signed quantity for a transaction: stock_in/return add, everything else subtracts.
function signedQty(txn) {
    return (txn.type === 'stock_in' || txn.type === 'return') ? txn.quantity : -txn.quantity;
}

// Current stock for many products in ONE query (avoids N+1 of product.currentStock()).
// Returns { [productId]: number }.
export async function getStockLevels(products) {
    if (!products || products.length === 0) return {};
    const productIds = products.map(p => p.id);
    const txns = await database.get('stock_transactions')
        .query(Q.where('product_id', Q.oneOf(productIds)))
        .fetch();

    const stockByProduct = Object.fromEntries(productIds.map(id => [id, 0]));
    for (const t of txns) stockByProduct[t.productId] += signedQty(t);
    return stockByProduct;
}

// Remaining quantity for many batches in ONE query (avoids N+1 of batch.currentQuantity()).
// Returns { [batchId]: number }.
export async function getBatchQuantities(batches) {
    if (!batches || batches.length === 0) return {};
    const batchIds = batches.map(b => b.id);
    const txns = await database.get('stock_transactions')
        .query(Q.where('batch_id', Q.oneOf(batchIds)))
        .fetch();

    const qtyByBatch = Object.fromEntries(batchIds.map(id => [id, 0]));
    for (const t of txns) {
        if (t.batchId in qtyByBatch) qtyByBatch[t.batchId] += signedQty(t);
    }
    return qtyByBatch;
}

// Fetch many products by id in ONE query. Returns a Map<id, Product>.
export async function getProductsByIds(ids) {
    const unique = [...new Set((ids || []).filter(Boolean))];
    if (unique.length === 0) return new Map();
    const products = await database.get('products')
        .query(Q.where('id', Q.oneOf(unique)))
        .fetch();
    return new Map(products.map(p => [p.id, p]));
}

export async function getLowStockProducts() {
    const products = await getAllProducts();
    if (products.length === 0) return [];

    const stockByProduct = await getStockLevels(products);

    const results = [];
    for (const p of products) {
        const stock = stockByProduct[p.id] ?? 0;
        if (stock <= p.reorderLevel) results.push({ product: p, stock });
    }
    return results.sort((a, b) => a.stock - b.stock);
}

export async function getNearExpiryBatches(days = 30) {
    const bId = getBusinessId();
    const now = Date.now();
    const cutoff = now + days * 86400000;

    const products = active(await database.get('products')
        .query(Q.where('business_id', bId))
        .fetch());

    const productIds = products.map(product => product.id);
    if (productIds.length === 0) return [];

    return database.get('stock_batches')
        .query(
            Q.where('product_id', Q.oneOf(productIds)),
            Q.where('expiry_date', Q.notEq(null)),
            Q.where('expiry_date', Q.gt(0)),
            Q.where('expiry_date', Q.lte(cutoff))
        )
        .fetch();
}

export async function getTodaySales() {
    const bId = getBusinessId();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = notVoided(await database.get('sale_orders')
        .query(
            Q.where('business_id', bId),
            Q.where('sale_at', Q.gte(startOfDay.getTime()))
        )
        .fetch());

    const total = orders.reduce((s, o) => s + o.totalAmount, 0);
    return { count: orders.length, total };
}

// Most recent orders for Home's "recent activity" glance. Newest-first by
// sale_at (the same field Order History sorts by) — each row also carries
// its item count and, for credit sales, the customer's name, since Home's
// row shows one or the other instead of the order id.
export async function getRecentOrders(limit = 4) {
    const bId = getBusinessId();
    // Over-fetch a little so voided bills don't leave the list short.
    const orders = notVoided(await database.get('sale_orders')
        .query(
            Q.where('business_id', bId),
            Q.sortBy('sale_at', Q.desc),
            Q.take(limit * 3)
        )
        .fetch()).slice(0, limit);

    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const items = await database.get('sale_items')
        .query(Q.where('order_id', Q.oneOf(orderIds)))
        .fetch();

    const itemCountByOrder = {};
    for (const item of items) {
        itemCountByOrder[item.orderId] = (itemCountByOrder[item.orderId] || 0) + 1;
    }

    const customerIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customerMap = customerIds.length ? await getCustomersByIds(customerIds) : new Map();

    return orders.map(order => ({
        order,
        itemCount: itemCountByOrder[order.id] || 0,
        customerName: order.customerId ? (customerMap.get(order.customerId)?.name ?? null) : null,
    }));
}

// End-of-day closing summary, computed entirely from the local DB (works offline).
export async function getDaySummary() {
    const bId = getBusinessId();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const start = startOfDay.getTime();

    const orders = notVoided(await database.get('sale_orders')
        .query(Q.where('business_id', bId), Q.where('sale_at', Q.gte(start)))
        .fetch());

    const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const byMode = { cash: 0, upi: 0, credit: 0 };
    for (const o of orders) {
        const mode = byMode[o.paymentMode] !== undefined ? o.paymentMode : 'cash';
        byMode[mode] += o.totalAmount;
    }

    const orderIds = orders.map(o => o.id);
    let itemsSold = 0;
    if (orderIds.length > 0) {
        const items = await database.get('sale_items')
            .query(Q.where('order_id', Q.oneOf(orderIds)))
            .fetch();
        itemsSold = items.reduce((sum, it) => sum + it.quantity, 0);
    }

    const wastageTxns = await database.get('stock_transactions')
        .query(Q.where('type', 'wastage'), Q.where('txn_at', Q.gte(start)))
        .fetch();
    const wastageUnits = wastageTxns.reduce((sum, t) => sum + t.quantity, 0);

    const ledgerToday = await database.get('ledger_entries')
        .query(Q.where('business_id', bId), Q.where('entry_at', Q.gte(start)))
        .fetch();
    const creditGiven = ledgerToday.filter(e => e.type === 'credit_sale').reduce((sum, e) => sum + e.amount, 0);
    const repaid = ledgerToday.filter(e => e.type === 'repayment' && e.note !== VOID_NOTE).reduce((sum, e) => sum + e.amount, 0);

    return { orderCount: orders.length, revenue, byMode, itemsSold, wastageUnits, creditGiven, repaid };
}

// ── Suppliers & purchase orders ─────────────────────────────────────────────────

export async function getSuppliers({ includeArchived = false } = {}) {
    const bId = getBusinessId();
    const rows = await database.get('suppliers')
        .query(Q.where('business_id', bId))
        .fetch();
    return (includeArchived ? rows : active(rows)).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export async function getSupplierById(id) {
    if (!id) return null;
    try {
        return await database.get('suppliers').find(id);
    } catch {
        return null;
    }
}

export async function saveSupplier({ supplierId, name, phone, note }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        if (supplierId) {
            const supplier = await database.get('suppliers').find(supplierId);
            return supplier.update(sp => {
                sp.name = name;
                sp.phone = phone || null;
                sp.note = note || null;
                sp.syncStatus = PENDING;
                sp.updatedAt = now;
            });
        }
        return database.get('suppliers').create(sp => {
            sp.businessId = bId;
            sp.name = name;
            sp.phone = phone || null;
            sp.note = note || null;
            sp.syncStatus = PENDING;
            sp.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

export async function setSupplierArchived(supplierId, archived) {
    const now = Date.now();
    const result = await database.write(async () => {
        const supplier = await database.get('suppliers').find(supplierId);
        return supplier.update(sp => {
            sp.archivedAt = archived ? now : null;
            sp.syncStatus = PENDING;
            sp.updatedAt = now;
        });
    });
    syncAfterWrite();
    return result;
}

// What we've bought from a supplier, newest first — derived from the stock
// batches tagged with that supplier at stock-in.
export async function getSupplierPurchases(supplierId) {
    const batches = await database.get('stock_batches')
        .query(Q.where('supplier_id', supplierId), Q.sortBy('created_at', Q.desc))
        .fetch();
    const productMap = await getProductsByIds(batches.map(b => b.productId));
    return batches.map(b => ({ batch: b, product: productMap.get(b.productId) }));
}

export async function getPurchaseOrders() {
    const bId = getBusinessId();
    return database.get('purchase_orders')
        .query(Q.where('business_id', bId), Q.sortBy('ordered_at', Q.desc))
        .fetch();
}

export async function createPurchaseOrder({ supplierId, items, note, status = 'draft' }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('purchase_orders').create(po => {
            po.businessId = bId;
            po.supplierId = supplierId || null;
            po.status = status;
            po.itemsJson = JSON.stringify(items);
            po.note = note || null;
            po.orderedAt = now;
            po.syncStatus = PENDING;
            po.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

export async function setPurchaseOrderStatus(orderId, status) {
    const now = Date.now();
    const result = await database.write(async () => {
        const po = await database.get('purchase_orders').find(orderId);
        return po.update(p => {
            p.status = status;
            p.syncStatus = PENDING;
            p.updatedAt = now;
        });
    });
    syncAfterWrite();
    return result;
}

// ── Bills ───────────────────────────────────────────────────────────────────────

// Everything a printed/shared bill needs for one order, from the local DB.
export async function getOrderForBill(orderId) {
    const order = await database.get('sale_orders').find(orderId);
    const items = await database.get('sale_items')
        .query(Q.where('order_id', orderId))
        .fetch();
    const productMap = await getProductsByIds(items.map(i => i.productId));
    const customer = order.customerId
        ? (await getCustomersByIds([order.customerId])).get(order.customerId) ?? null
        : null;
    return {
        order,
        customer,
        lines: items.map(i => ({
            name: productMap.get(i.productId)?.name ?? 'Item',
            unit: productMap.get(i.productId)?.unit ?? '',
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice,
        })),
    };
}

// ── Voice entry helpers ─────────────────────────────────────────────────────────

// A credit entry not tied to a sale ("Ramesh took ₹200 udhaar") — same ledger
// row type as a credit sale, just without an order_id.
export async function recordCreditEntry({ customerId, amount, note }) {
    const bId = getBusinessId();
    const now = Date.now();

    const result = await database.write(async () => {
        return database.get('ledger_entries').create(e => {
            e.businessId = bId;
            e.customerId = customerId;
            e.orderId = null;
            e.type = 'credit_sale';
            e.amount = amount;
            e.note = note || '';
            e.entryAt = now;
            e.syncStatus = PENDING;
            e.updatedAt = now;
        });
    });

    syncAfterWrite();
    return result;
}

// FEFO: earliest-expiring unexpired batch first; batches with no expiry
// (loose goods) last. Shared by barcode scanning and voice-prefilled carts.
export async function pickSaleBatch(product) {
    const batches = await product.stockBatches.fetch();
    return batches
        .filter(b => !b.isExpired)
        .sort((a, b) => (a.expiryDate || Infinity) - (b.expiryDate || Infinity))[0] ?? null;
}

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]/g, ' ').replace(/\s+/g, ' ').trim();

// Best local match for a spoken name: exact, then prefix/contains, then the
// most shared words. Returns null when nothing is close enough.
function bestNameMatch(rows, spoken) {
    const q = norm(spoken);
    if (!q) return null;
    let best = null;
    let bestScore = 0;
    const qWords = q.split(' ');
    for (const row of rows) {
        const n = norm(row.name);
        let score = 0;
        if (n === q) score = 100;
        else if (n.startsWith(q) || q.startsWith(n)) score = 80;
        else if (n.includes(q) || q.includes(n)) score = 60;
        else score = qWords.filter(w => w.length > 1 && n.split(' ').includes(w)).length * 20;
        if (score > bestScore) { best = row; bestScore = score; }
    }
    return bestScore >= 20 ? best : null;
}

export async function matchCustomerByName(spoken) {
    const bId = getBusinessId();
    const all = active(await database.get('customers').query(Q.where('business_id', bId)).fetch());
    return bestNameMatch(all, spoken);
}

export async function matchProductByName(spoken) {
    return bestNameMatch(await getAllProducts(), spoken);
}
