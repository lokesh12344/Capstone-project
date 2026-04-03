require('dotenv').config({ path: __dirname + '/../../.env' });

const { v4: uuidv4 } = require('uuid');
const { pool } = require('../db/pool');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const shouldReset = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';

const CUSTOMERS = [
    { name: 'Asha Singh', phone: '9000000001', segment: 'regular' },
    { name: 'Ravi Kumar', phone: '9000000002', segment: 'regular' },
    { name: 'Neha Verma', phone: '9000000003', segment: 'occasional' },
    { name: 'Sanjay Patel', phone: '9000000004', segment: 'occasional' },
    { name: 'Kiran Shah', phone: '9000000005', segment: 'dormant' },
    { name: 'Pooja Jain', phone: '9000000006', segment: 'dormant' },
    { name: 'Vikram Joshi', phone: '9000000007', segment: 'new' },
    { name: 'Meera Iyer', phone: '9000000008', segment: 'new' },
];

const PRODUCTS = [
    {
        key: 'atta',
        name: 'Aashirvaad Atta 5kg',
        brand: 'Aashirvaad',
        barcode: '8901030893346',
        category: 'Grocery',
        unit: 'pcs',
        sellingPrice: 265,
        costPrice: 230,
        reorderLevel: 12,
        saleVelocity: 'high',
        batches: [
            { batchNo: 'ATTA-A1', receivedQty: 40, remainingQty: 6, expiryOffsetDays: 150, receivedDaysAgo: 32 },
            { batchNo: 'ATTA-B1', receivedQty: 24, remainingQty: 18, expiryOffsetDays: 240, receivedDaysAgo: 8 },
        ],
    },
    {
        key: 'rice',
        name: 'India Gate Basmati Rice 5kg',
        brand: 'India Gate',
        barcode: '8901072002476',
        category: 'Grocery',
        unit: 'pcs',
        sellingPrice: 699,
        costPrice: 610,
        reorderLevel: 8,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'RICE-A1', receivedQty: 26, remainingQty: 14, expiryOffsetDays: 210, receivedDaysAgo: 24 },
        ],
    },
    {
        key: 'salt',
        name: 'Tata Salt 1kg',
        brand: 'Tata Salt',
        barcode: '8901058000015',
        category: 'Grocery',
        unit: 'pcs',
        sellingPrice: 28,
        costPrice: 22,
        reorderLevel: 20,
        saleVelocity: 'high',
        batches: [
            { batchNo: 'SALT-A1', receivedQty: 80, remainingQty: 34, expiryOffsetDays: 300, receivedDaysAgo: 40 },
        ],
    },
    {
        key: 'oil',
        name: 'Fortune Sunflower Oil 1L',
        brand: 'Fortune',
        barcode: '8901462106016',
        category: 'Grocery',
        unit: 'pcs',
        sellingPrice: 185,
        costPrice: 162,
        reorderLevel: 15,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'OIL-A1', receivedQty: 30, remainingQty: 9, expiryOffsetDays: 120, receivedDaysAgo: 20 },
        ],
    },
    {
        key: 'tea',
        name: 'Tata Tea Premium 500g',
        brand: 'Tata Tea',
        barcode: '8901058004013',
        category: 'Grocery',
        unit: 'pcs',
        sellingPrice: 275,
        costPrice: 240,
        reorderLevel: 10,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'TEA-A1', receivedQty: 24, remainingQty: 11, expiryOffsetDays: 180, receivedDaysAgo: 18 },
        ],
    },
    {
        key: 'biscuits',
        name: 'Parle-G Original 800g',
        brand: 'Parle',
        barcode: '8901719112195',
        category: 'Snack',
        unit: 'pcs',
        sellingPrice: 65,
        costPrice: 55,
        reorderLevel: 20,
        saleVelocity: 'high',
        batches: [
            { batchNo: 'BISC-A1', receivedQty: 70, remainingQty: 12, expiryOffsetDays: 120, receivedDaysAgo: 16 },
        ],
    },
    {
        key: 'chips',
        name: "Lay's Classic Salted 78g",
        brand: "Lay's",
        barcode: '8901491105157',
        category: 'Snack',
        unit: 'pcs',
        sellingPrice: 20,
        costPrice: 16,
        reorderLevel: 25,
        saleVelocity: 'high',
        batches: [
            { batchNo: 'CHIP-A1', receivedQty: 60, remainingQty: 7, expiryOffsetDays: 75, receivedDaysAgo: 10 },
        ],
    },
    {
        key: 'maggi',
        name: 'Maggi 2-Min Noodles 420g',
        brand: 'Nestle',
        barcode: '8901058817021',
        category: 'Snack',
        unit: 'pcs',
        sellingPrice: 80,
        costPrice: 68,
        reorderLevel: 20,
        saleVelocity: 'high',
        batches: [
            { batchNo: 'MAGGI-A1', receivedQty: 30, remainingQty: 0, expiryOffsetDays: 70, receivedDaysAgo: 15 },
        ],
    },
    {
        key: 'butter',
        name: 'Amul Butter 500g',
        brand: 'Amul',
        barcode: '8901233000504',
        category: 'Dairy',
        unit: 'pcs',
        sellingPrice: 245,
        costPrice: 214,
        reorderLevel: 8,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'BUTTER-A1', receivedQty: 16, remainingQty: 4, expiryOffsetDays: 3, receivedDaysAgo: 12, wastageQty: 1 },
        ],
    },
    {
        key: 'cheese',
        name: 'Amul Cheese Slices 750g',
        brand: 'Amul',
        barcode: '8901233010268',
        category: 'Dairy',
        unit: 'pcs',
        sellingPrice: 385,
        costPrice: 336,
        reorderLevel: 5,
        saleVelocity: 'slow',
        batches: [
            { batchNo: 'CHEESE-A1', receivedQty: 12, remainingQty: 3, expiryOffsetDays: -2, receivedDaysAgo: 20 },
        ],
    },
    {
        key: 'ghee',
        name: 'Amul Ghee 1L',
        brand: 'Amul',
        barcode: '8901233001007',
        category: 'Dairy',
        unit: 'pcs',
        sellingPrice: 699,
        costPrice: 612,
        reorderLevel: 6,
        saleVelocity: 'slow',
        batches: [
            { batchNo: 'GHEE-A1', receivedQty: 14, remainingQty: 9, expiryOffsetDays: 260, receivedDaysAgo: 26 },
        ],
    },
    {
        key: 'juice',
        name: 'Tropicana Orange 1L',
        brand: 'Tropicana',
        barcode: '8901491100015',
        category: 'Beverage',
        unit: 'pcs',
        sellingPrice: 130,
        costPrice: 112,
        reorderLevel: 10,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'JUICE-A1', receivedQty: 22, remainingQty: 6, expiryOffsetDays: 12, receivedDaysAgo: 18 },
        ],
    },
    {
        key: 'toothpaste',
        name: 'Colgate Strong Teeth 300g',
        brand: 'Colgate',
        barcode: '8901314006443',
        category: 'Personal Care',
        unit: 'pcs',
        sellingPrice: 110,
        costPrice: 92,
        reorderLevel: 15,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'COLGATE-A1', receivedQty: 32, remainingQty: 17, expiryOffsetDays: 300, receivedDaysAgo: 22, returnQty: 2 },
        ],
    },
    {
        key: 'detergent',
        name: 'Surf Excel Easy Wash 1kg',
        brand: 'Surf Excel',
        barcode: '8901030838313',
        category: 'Household',
        unit: 'pcs',
        sellingPrice: 155,
        costPrice: 132,
        reorderLevel: 15,
        saleVelocity: 'medium',
        batches: [
            { batchNo: 'SURF-A1', receivedQty: 28, remainingQty: 13, expiryOffsetDays: 300, receivedDaysAgo: 28 },
        ],
    },
];

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choose(list) {
    return list[randInt(0, list.length - 1)];
}

function chooseCustomer(customerPools, daysAgo) {
    if (Math.random() < 0.18) return null;
    if (daysAgo <= 14) return choose(customerPools.regular);
    if (daysAgo <= 30) return choose([...customerPools.regular, ...customerPools.occasional]);
    return choose([...customerPools.occasional, ...customerPools.dormant]);
}

function choosePaymentMode(customer) {
    if (!customer) return choose(['cash', 'cash', 'upi']);
    if (customer.segment === 'regular') return choose(['upi', 'cash', 'credit']);
    if (customer.segment === 'occasional') return choose(['cash', 'upi']);
    return choose(['cash', 'credit']);
}

function chooseDaysAgo(saleVelocity) {
    if (saleVelocity === 'high') return randInt(0, 18);
    if (saleVelocity === 'medium') return randInt(4, 32);
    return randInt(18, 55);
}

function splitIntoSaleEvents(totalQty, saleVelocity) {
    const chunks = [];
    let remaining = totalQty;
    while (remaining > 0) {
        const qty = Math.min(remaining, randInt(1, Math.min(4, remaining)));
        chunks.push({
            qty,
            daysAgo: chooseDaysAgo(saleVelocity),
        });
        remaining -= qty;
    }
    return chunks;
}

async function resolveBusiness(client) {
    const explicitBusinessId = process.env.SEED_BUSINESS_ID;
    if (explicitBusinessId) {
        const { rows } = await client.query(
            'SELECT id, name, phone FROM businesses WHERE id = $1',
            [explicitBusinessId]
        );
        if (rows.length === 0) throw new Error(`Business ${explicitBusinessId} not found`);
        return rows[0];
    }

    const { rows } = await client.query(
        'SELECT id, name, phone FROM businesses ORDER BY created_at ASC LIMIT 1'
    );
    if (rows.length === 0) {
        throw new Error('No business found. Register a business first, then run the seed script.');
    }
    return rows[0];
}

async function resetBusinessData(client, businessId) {
    console.log(`[seed] Resetting existing operational data for business ${businessId}`);

    await client.query(
        `DELETE FROM sale_items si
         USING sale_orders so
         WHERE si.order_id = so.id
           AND so.business_id = $1`,
        [businessId]
    );

    await client.query(
        `DELETE FROM stock_transactions st
         USING products p
         WHERE st.product_id = p.id
           AND p.business_id = $1`,
        [businessId]
    );

    await client.query(
        `DELETE FROM stock_batches sb
         USING products p
         WHERE sb.product_id = p.id
           AND p.business_id = $1`,
        [businessId]
    );

    await client.query('DELETE FROM sale_orders WHERE business_id = $1', [businessId]);
    await client.query('DELETE FROM customers WHERE business_id = $1', [businessId]);
    await client.query('DELETE FROM products WHERE business_id = $1', [businessId]);
}

async function seedCustomers(client, businessId) {
    const records = [];
    for (const customer of CUSTOMERS) {
        const id = uuidv4();
        await client.query(
            `INSERT INTO customers
             (id, business_id, name, phone, segment, last_purchase_at, sync_status, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'synced',$7)`,
            [id, businessId, customer.name, customer.phone, customer.segment, null, now]
        );
        records.push({ id, ...customer });
    }
    return records;
}

async function seedProductsAndInventory(client, businessId) {
    const saleEvents = [];
    const products = [];

    for (const product of PRODUCTS) {
        const productId = uuidv4();

        await client.query(
            `INSERT INTO products
             (id, business_id, name, category, barcode, brand, unit,
              reorder_level, schedule_h, selling_price, sync_status, updated_at, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'synced',$11,NOW())`,
            [
                productId,
                businessId,
                product.name,
                product.category,
                product.barcode,
                product.brand,
                product.unit,
                product.reorderLevel,
                false,
                product.sellingPrice,
                now,
            ]
        );

        const batches = [];

        for (const plan of product.batches) {
            const batchId = uuidv4();
            const createdAt = now - plan.receivedDaysAgo * DAY;
            const expiryDate = now + plan.expiryOffsetDays * DAY;
            const returnQty = plan.returnQty || 0;
            const wastageQty = plan.wastageQty || 0;
            const soldQty = Math.max(0, plan.receivedQty + returnQty - wastageQty - plan.remainingQty);

            await client.query(
                `INSERT INTO stock_batches
                 (id, product_id, quantity, batch_no, expiry_date, cost_price, sync_status, created_at, updated_at)
                 VALUES ($1,$2,$3,$4,$5,$6,'synced',$7,$8)`,
                [batchId, productId, plan.remainingQty, plan.batchNo, expiryDate, product.costPrice, createdAt, now]
            );

            await client.query(
                `INSERT INTO stock_transactions
                 (id, product_id, batch_id, type, quantity, txn_at, sync_status, updated_at)
                 VALUES ($1,$2,$3,'stock_in',$4,$5,'synced',$6)`,
                [uuidv4(), productId, batchId, plan.receivedQty, createdAt, now]
            );

            if (returnQty > 0) {
                await client.query(
                    `INSERT INTO stock_transactions
                     (id, product_id, batch_id, type, quantity, txn_at, sync_status, updated_at)
                     VALUES ($1,$2,$3,'return',$4,$5,'synced',$6)`,
                    [uuidv4(), productId, batchId, returnQty, createdAt + 9 * DAY, now]
                );
            }

            if (wastageQty > 0) {
                await client.query(
                    `INSERT INTO stock_transactions
                     (id, product_id, batch_id, type, quantity, txn_at, sync_status, updated_at)
                     VALUES ($1,$2,$3,'wastage',$4,$5,'synced',$6)`,
                    [uuidv4(), productId, batchId, wastageQty, now - 2 * DAY, now]
                );
            }

            splitIntoSaleEvents(soldQty, product.saleVelocity).forEach(({ qty, daysAgo }) => {
                saleEvents.push({
                    qty,
                    daysAgo,
                    unitPrice: product.sellingPrice,
                    productId,
                    batchId,
                });
            });

            batches.push({ id: batchId, ...plan });
        }

        products.push({ id: productId, ...product, batches });
    }

    return { products, saleEvents };
}

async function seedSales(client, businessId, customers, saleEvents) {
    const customerPools = {
        regular: customers.filter(customer => customer.segment === 'regular'),
        occasional: customers.filter(customer => customer.segment === 'occasional'),
        dormant: customers.filter(customer => customer.segment === 'dormant'),
    };

    const lastPurchaseByCustomer = new Map();
    const sortedEvents = saleEvents.sort((a, b) => a.daysAgo - b.daysAgo);
    let orderCount = 0;

    for (const event of sortedEvents) {
        const customer = chooseCustomer(customerPools, event.daysAgo);
        const paymentMode = choosePaymentMode(customer);
        const saleAt = now - event.daysAgo * DAY - randInt(1, 10) * 60 * 60 * 1000;
        const orderId = uuidv4();

        await client.query(
            `INSERT INTO sale_orders
             (id, business_id, customer_id, total_amount, payment_mode, sale_at, sync_status, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,'synced',$7)`,
            [
                orderId,
                businessId,
                customer ? customer.id : null,
                event.qty * event.unitPrice,
                paymentMode,
                saleAt,
                now,
            ]
        );

        await client.query(
            `INSERT INTO sale_items
             (id, order_id, product_id, batch_id, quantity, unit_price, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [uuidv4(), orderId, event.productId, event.batchId, event.qty, event.unitPrice, now]
        );

        await client.query(
            `INSERT INTO stock_transactions
             (id, product_id, batch_id, type, quantity, txn_at, sync_status, updated_at)
             VALUES ($1,$2,$3,'sale',$4,$5,'synced',$6)`,
            [uuidv4(), event.productId, event.batchId, event.qty, saleAt, now]
        );

        if (customer) {
            const current = lastPurchaseByCustomer.get(customer.id) || 0;
            lastPurchaseByCustomer.set(customer.id, Math.max(current, saleAt));
        }

        orderCount += 1;
    }

    for (const customer of customers) {
        const lastPurchaseAt = lastPurchaseByCustomer.get(customer.id) || null;
        await client.query(
            `UPDATE customers
             SET last_purchase_at = $2,
                 segment = $3,
                 sync_status = 'synced',
                 updated_at = $4
             WHERE id = $1`,
            [customer.id, lastPurchaseAt, customer.segment, now]
        );
    }

    return orderCount;
}

async function main() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const business = await resolveBusiness(client);
        console.log(`[seed] Target business: ${business.name} (${business.phone})`);

        if (shouldReset) {
            await resetBusinessData(client, business.id);
        } else {
            console.log('[seed] Running without --reset. Existing business data will be preserved and new demo data will be appended.');
        }

        const customers = await seedCustomers(client, business.id);
        const { products, saleEvents } = await seedProductsAndInventory(client, business.id);
        const orderCount = await seedSales(client, business.id, customers, saleEvents);

        await client.query('COMMIT');

        console.log('[seed] Demo dataset created successfully.');
        console.log(`[seed] Products: ${products.length}`);
        console.log(`[seed] Customers: ${customers.length}`);
        console.log(`[seed] Orders: ${orderCount}`);
        console.log('[seed] This dataset includes low stock, out of stock, near-expiry, expired stock, repeat customers, dormant customers, and mixed payment modes.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[seed] Failed:', error);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    main,
};
