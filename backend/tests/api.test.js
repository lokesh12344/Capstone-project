// Integration tests against a real, throwaway Postgres database.
// Run with TEST_DATABASE_URL set (see package.json "test"); the database is
// migrated fresh by tests/globalSetup.js and never points at production.
const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const { pool } = require('../src/db/pool');

const api = request(app);
const uniquePhone = () => '9' + String(Math.floor(Math.random() * 1e9)).padStart(9, '0');

async function registerShop(type = 'kirana') {
    const phone = uniquePhone();
    const res = await api.post('/api/auth/register')
        .send({ name: 'Test Shop', phone, password: 'secret123', type });
    expect(res.status).toBe(201);
    return { token: res.body.token, business: res.body.business, phone };
}

const auth = token => ({ Authorization: `Bearer ${token}` });

function productRow(overrides = {}) {
    return {
        id: randomUUID(), name: 'Rice 1kg', category: 'Grocery', barcode: '', brand: '',
        unit: 'pcs', reorder_level: 5, schedule_h: false, selling_price: 60,
        updated_at: Date.now(), ...overrides,
    };
}

async function push(token, changes) {
    return api.post('/api/sync/push').set(auth(token)).send({ changes });
}

afterAll(() => pool.end());

describe('auth', () => {
    test('register + login returns owner role', async () => {
        const { phone } = await registerShop();
        const res = await api.post('/api/auth/login').send({ phone, password: 'secret123' });
        expect(res.status).toBe(200);
        expect(res.body.role).toBe('owner');
        expect(res.body.business.password_hash).toBeUndefined();
    });

    test('wrong password is rejected', async () => {
        const { phone } = await registerShop();
        const res = await api.post('/api/auth/login').send({ phone, password: 'nope1234' });
        expect(res.status).toBe(401);
    });

    test('requests without a token are rejected', async () => {
        const res = await api.get('/api/sync/pull');
        expect(res.status).toBe(401);
    });
});

describe('sync', () => {
    test('pushed rows come back on pull, with a server-side cursor', async () => {
        const { token } = await registerShop();
        // A phone with a clock years in the past must still be pulled by others.
        const p = productRow({ updated_at: 1000 });
        expect((await push(token, { products: { created: [p], updated: [] } })).status).toBe(200);

        const first = await api.get('/api/sync/pull?last_pulled_at=0').set(auth(token));
        expect(first.body.changes.products.created.map(r => r.id)).toContain(p.id);

        const later = await api.get(`/api/sync/pull?last_pulled_at=${Date.now() + 60000}`).set(auth(token));
        expect(later.body.changes.products.created).toHaveLength(0);
    });

    test('loose items: stock batch without batch number or expiry', async () => {
        const { token } = await registerShop();
        const p = productRow();
        const batch = { id: randomUUID(), product_id: p.id, quantity: 25, batch_no: '', expiry_date: 0, cost_price: 40, updated_at: Date.now() };
        const res = await push(token, {
            products: { created: [p] },
            stock_batches: { created: [batch] },
        });
        expect(res.status).toBe(200);
        const { rows } = await pool.query('SELECT batch_no, expiry_date FROM stock_batches WHERE id = $1', [batch.id]);
        expect(rows[0]).toEqual({ batch_no: null, expiry_date: null });
    });

    test('older apps never receive the new tables', async () => {
        const { token } = await registerShop();
        const supplier = { id: randomUUID(), name: 'Gupta Traders', phone: '9876543210', note: '', updated_at: Date.now() };
        await push(token, { suppliers: { created: [supplier] } });

        const old = await api.get('/api/sync/pull?last_pulled_at=0').set(auth(token));
        expect(old.body.changes.suppliers).toBeUndefined();

        const current = await api.get('/api/sync/pull?last_pulled_at=0&schema_version=5').set(auth(token));
        expect(current.body.changes.suppliers.created.map(s => s.id)).toEqual([supplier.id]);
        expect(current.body.changes.purchase_orders.created).toEqual([]);
    });

    test('purchase orders round-trip', async () => {
        const { token } = await registerShop();
        const po = {
            id: randomUUID(), supplier_id: null, status: 'sent',
            items_json: JSON.stringify([{ product_id: 'x', name: 'Sugar', quantity: 10 }]),
            note: '', ordered_at: Date.now(), updated_at: Date.now(),
        };
        await push(token, { purchase_orders: { created: [po] } });
        const res = await api.get('/api/sync/pull?last_pulled_at=0&schema_version=5').set(auth(token));
        const back = res.body.changes.purchase_orders.created[0];
        expect(back.status).toBe('sent');
        expect(JSON.parse(back.items_json)[0].quantity).toBe(10);
    });

    test('one shop cannot overwrite another shop\'s supplier', async () => {
        const a = await registerShop();
        const b = await registerShop();
        const supplier = { id: randomUUID(), name: 'Original', updated_at: Date.now() };
        await push(a.token, { suppliers: { created: [supplier] } });
        await push(b.token, { suppliers: { updated: [{ ...supplier, name: 'Hijacked' }] } });
        const { rows } = await pool.query('SELECT name FROM suppliers WHERE id = $1', [supplier.id]);
        expect(rows[0].name).toBe('Original');
    });
});

describe('products', () => {
    test('low-stock lists products at or below reorder level, skipping archived ones', async () => {
        const { token } = await registerShop();
        const low = productRow({ name: 'Low' });
        const fine = productRow({ name: 'Fine' });
        const gone = productRow({ name: 'Archived', archived_at: Date.now() });
        const stockIn = (p, qty) => {
            const batch = { id: randomUUID(), product_id: p.id, quantity: qty, cost_price: 10, updated_at: Date.now() };
            const txn = { id: randomUUID(), product_id: p.id, batch_id: batch.id, type: 'stock_in', quantity: qty, txn_at: Date.now() };
            return { batch, txn };
        };
        const ins = [stockIn(low, 2), stockIn(fine, 50)];
        await push(token, {
            products: { created: [low, fine, gone] },
            stock_batches: { created: ins.map(i => i.batch) },
            stock_transactions: { created: ins.map(i => i.txn) },
        });

        const res = await api.get('/api/products/low-stock').set(auth(token));
        expect(res.status).toBe(200);
        expect(res.body.low_stock.map(r => r.name)).toEqual(['Low']);
    });
});

describe('discounts', () => {
    test('a sale price round-trips, and an older app editing the product keeps it', async () => {
        const { token } = await registerShop();
        const p = productRow({ selling_price: 48, regular_price: 60 });
        await push(token, { products: { created: [p] } });

        // an app from before discounts doesn't send regular_price at all
        const { regular_price: _drop, ...oldAppRow } = p;
        await push(token, { products: { updated: [{ ...oldAppRow, reorder_level: 9, updated_at: Date.now() }] } });

        const pull = await api.get('/api/sync/pull?last_pulled_at=0&schema_version=7').set(auth(token));
        const row = pull.body.changes.products.created.find(r => r.id === p.id);
        expect(row.regular_price).toBe(60);
        expect(row.selling_price).toBe(48);
        expect(row.reorder_level).toBe(9);
    });

    test('ending a sale clears regular_price', async () => {
        const { token } = await registerShop();
        const p = productRow({ selling_price: 48, regular_price: 60 });
        await push(token, { products: { created: [p] } });
        await push(token, { products: { updated: [{ ...p, selling_price: 60, regular_price: null, updated_at: Date.now() }] } });
        const { rows } = await pool.query('SELECT regular_price FROM products WHERE id = $1', [p.id]);
        expect(rows[0].regular_price).toBeNull();
    });
});

describe('on-sale analytics', () => {
    test('intelligence lists products on sale, but not ones whose sale has ended', async () => {
        const { token } = await registerShop();
        const live = productRow({ name: 'Live sale', selling_price: 48, regular_price: 60, sale_until: Date.now() + 86400000 });
        const ended = productRow({ name: 'Ended sale', selling_price: 48, regular_price: 60, sale_until: Date.now() - 1000 });
        await push(token, { products: { created: [live, ended] } });

        const res = await api.get('/api/analytics/inventory/intelligence').set(auth(token));
        expect(res.status).toBe(200);
        expect(res.body.on_sale.items.map(i => i.name)).toEqual(['Live sale']);
        expect(res.body.on_sale.items[0].discount_pct).toBe(20);
    });
});

describe('shop profile', () => {
    test('owner can set UPI ID and address', async () => {
        const { token } = await registerShop();
        const res = await api.put('/api/business/profile').set(auth(token))
            .send({ upi_id: 'ramesh@okaxis', address: 'Shop 4, Chembur' });
        expect(res.status).toBe(200);
        expect(res.body.business.upi_id).toBe('ramesh@okaxis');
    });

    test('invalid UPI ID is rejected', async () => {
        const { token } = await registerShop();
        const res = await api.put('/api/business/profile').set(auth(token)).send({ upi_id: 'not-a-vpa' });
        expect(res.status).toBe(422);
    });
});

describe('staff', () => {
    async function addStaff(ownerToken) {
        const phone = uniquePhone();
        const res = await api.post('/api/staff').set(auth(ownerToken))
            .send({ name: 'Raju', phone, password: 'staff123' });
        expect(res.status).toBe(201);
        const login = await api.post('/api/auth/login').send({ phone, password: 'staff123' });
        expect(login.status).toBe(200);
        return { id: res.body.staff.id, token: login.body.token, login: login.body };
    }

    test('staff login gets the owner\'s business and staff role', async () => {
        const owner = await registerShop();
        const staff = await addStaff(owner.token);
        expect(staff.login.role).toBe('staff');
        expect(staff.login.business.id).toBe(owner.business.id);
    });

    test('staff can sell but cannot reprice an existing product', async () => {
        const owner = await registerShop();
        const staff = await addStaff(owner.token);
        const p = productRow({ selling_price: 60 });
        await push(owner.token, { products: { created: [p] } });

        await push(staff.token, { products: { updated: [{ ...p, selling_price: 1, updated_at: Date.now() }] } });
        const { rows } = await pool.query('SELECT selling_price FROM products WHERE id = $1', [p.id]);
        expect(rows[0].selling_price).toBe(60);
    });

    test('staff cannot put a product on sale', async () => {
        const owner = await registerShop();
        const staff = await addStaff(owner.token);
        const p = productRow({ selling_price: 60 });
        await push(owner.token, { products: { created: [p] } });

        await push(staff.token, { products: { updated: [{ ...p, selling_price: 30, regular_price: 60, updated_at: Date.now() }] } });
        const { rows } = await pool.query('SELECT selling_price, regular_price FROM products WHERE id = $1', [p.id]);
        expect(rows[0]).toEqual({ selling_price: 60, regular_price: null });
    });

    test('staff cannot manage staff or edit the shop profile', async () => {
        const owner = await registerShop();
        const staff = await addStaff(owner.token);
        expect((await api.get('/api/staff').set(auth(staff.token))).status).toBe(403);
        expect((await api.put('/api/business/profile').set(auth(staff.token)).send({ upi_id: 'x@ybl' })).status).toBe(403);
    });

    test('removed staff are locked out immediately', async () => {
        const owner = await registerShop();
        const staff = await addStaff(owner.token);
        expect((await api.delete(`/api/staff/${staff.id}`).set(auth(owner.token))).status).toBe(200);
        expect((await api.get('/api/sync/pull').set(auth(staff.token))).status).toBe(401);
    });

    test('a staff phone cannot also register as a shop', async () => {
        const owner = await registerShop();
        const phone = uniquePhone();
        await api.post('/api/staff').set(auth(owner.token)).send({ name: 'A', phone, password: 'staff123' });
        const res = await api.post('/api/auth/register').send({ name: 'X', phone, password: 'secret123' });
        expect(res.status).toBe(409);
    });
});

describe('voice', () => {
    test('rejects a request with no audio', async () => {
        const { token } = await registerShop();
        const saved = process.env.GEMINI_API_KEY;
        process.env.GEMINI_API_KEY = saved || 'test-key';
        const res = await api.post('/api/voice/parse').set(auth(token)).send({});
        process.env.GEMINI_API_KEY = saved;
        expect(res.status).toBe(422);
    });
});
