// Realistic demo kirana — a fresh business with 4 weeks of simulated trading,
// built on REAL Open Food Facts products (every barcode below is a real
// EAN-13 from data/off_products.json, so scanning the physical pack works).
//
// Unlike seed_finale.js this is a generator: a day-by-day simulation of a
// Pune neighbourhood store. Stock only goes out if it was received, sales come
// off the oldest batch first, perishables that expire get written off as
// wastage, suppliers deliver on their own schedule, and khata customers buy on
// credit and pay back in round amounts. A seeded RNG keeps runs reproducible.
//
// Run with:
//   node src/scripts/seed_kirana_demo.js --dry-run          (simulate + print stats, no DB)
//   node src/scripts/seed_kirana_demo.js [--reset]          (writes to DATABASE_URL)

require('dotenv').config({ path: __dirname + '/../../.env' });

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const IST = 5.5 * HOUR;
const DAYS = 28;                                  // 2 weeks + the 2 weeks before
const now = Date.now();
const todayIst = Math.floor((now + IST) / DAY) * DAY - IST; // IST midnight, as UTC ms

const dryRun = process.argv.includes('--dry-run');
const shouldReset = process.argv.includes('--reset') || process.env.SEED_RESET === 'true';

// ── Seeded RNG ────────────────────────────────────────────────────────────────
let seed = 20261028;
function rand() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const chance = p => rand() < p;
function weighted(items, w) {
    const total = items.reduce((s, x) => s + w(x), 0);
    let r = rand() * total;
    for (const x of items) { r -= w(x); if (r <= 0) return x; }
    return items[items.length - 1];
}

// ── Business ──────────────────────────────────────────────────────────────────
const BUSINESS = {
    name: 'Shree Sai Kirana Stores',
    phone: '9822014567',
    password: 'demo1234',
    type: 'kirana',
    upi_id: 'saikirana@okaxis',
    address: 'Shop 4, Sai Krupa Apts, Paud Road, Kothrud, Pune 411038',
    gstin: '27AKLPS4821K1Z6',
};
const STAFF = [{ name: 'Raju Pawar', phone: '9822014568', password: 'staff1234' }];

// ── Suppliers ─────────────────────────────────────────────────────────────────
// every = delivery cadence in days; offset = which day of the cycle they come.
const SUPPLIERS = {
    dairy: { name: 'Gokul Dairy Agency (Amul/Mother Dairy)', phone: '9850112233', note: 'Delivers every alternate morning before 7', every: 2, offset: 0 },
    fmcg:  { name: 'Mahalaxmi Distributors (HUL, Nestle, ITC)', phone: '9823445566', note: 'Salesman visits Monday, delivery Tuesday', every: 7, offset: 1 },
    snack: { name: 'Shubham Traders — Biscuits & Namkeen', phone: '9767889900', note: 'Parle, Britannia, Haldiram, PepsiCo', every: 7, offset: 4 },
    bev:   { name: 'Om Sai Beverages', phone: '9881223344', note: 'Cold drinks, juices, water — Fri delivery', every: 7, offset: 3 },
    grain: { name: 'Market Yard Wholesale — Rathi & Sons', phone: '9422334455', note: 'Loose grains, sugar, dal. Cash on delivery', every: 7, offset: 5 },
};

// ── Catalogue ─────────────────────────────────────────────────────────────────
// barcode → [display name, category, MRP, reorder level, shelf life days (0 = none), avg units/day, supplier]
// Names/brands/barcodes come from Open Food Facts; MRPs are current Indian
// retail prices for that pack size.
const CATALOG = {
    '8901719100956': ['Parle-G Glucose Biscuits 80g', 'Snack', 10, 30, 150, 9, 'snack'],
    '8901719255151': ['Parle-G Original Gluco Biscuits 150g', 'Snack', 20, 15, 150, 4, 'snack'],
    '8901719123801': ['Parle Monaco 400g', 'Snack', 60, 5, 150, 0.7, 'snack'],
    '8901719100826': ['Parle Hide & Seek 120g', 'Snack', 40, 6, 180, 1.2, 'snack'],
    '8901063004207': ['Britannia Good Day Chocochip 111g', 'Snack', 30, 8, 150, 2, 'snack'],
    '8901063091023': ['Britannia Good Day Harmony 120g', 'Snack', 30, 6, 150, 1, 'snack'],
    '8901063162242': ['Britannia Marie Gold 1kg', 'Snack', 160, 3, 180, 0.4, 'snack'],
    '8901063342033': ['Britannia Bread 250g', 'Bakery', 30, 8, 4, 5, 'dairy'],
    '8901725133979': ['Sunfeast Dark Fantasy Bourbon 50g', 'Snack', 10, 12, 150, 3, 'snack'],
    '8904063204325': ["Haldiram's Aloo Bhujia 400g", 'Snack', 110, 4, 120, 0.8, 'snack'],
    '8904004400588': ["Haldiram's Lite Chiwda 57g", 'Snack', 10, 12, 120, 2.5, 'snack'],
    '8904004403732': ["Haldiram's Moong Dal 200g", 'Snack', 55, 5, 120, 1, 'snack'],
    '8906005508904': ['Bikaji Bhelpuri Chowpati 110g', 'Snack', 30, 4, 120, 0.6, 'snack'],
    '8901491101813': ["Lay's India's Magic Masala 55g", 'Snack', 20, 15, 90, 4, 'snack'],
    '8901491001038': ["Lay's Spanish Tomato Tango 90g", 'Snack', 30, 6, 90, 1.2, 'snack'],
    '8901491982351': ["Lay's American Style Cream & Onion 50g", 'Snack', 20, 10, 90, 2.5, 'snack'],
    '8901491367219': ['Kurkure Masala Munch 25g', 'Snack', 10, 15, 90, 4, 'snack'],
    '8901491103084': ['Kurkure Masala Munch 75g', 'Snack', 20, 8, 90, 1.5, 'snack'],
    '8901491400008': ['Uncle Chipps Spicy Treat', 'Snack', 10, 8, 90, 1.2, 'snack'],
    '8901058000269': ['Maggi 2-Minute Masala Noodles 280g (4 pack)', 'Instant Food', 56, 10, 270, 2.5, 'fmcg'],
    '8901058901542': ['Maggi 2-Minute Masala Noodles 140g (2 pack)', 'Instant Food', 28, 10, 270, 3, 'fmcg'],
    '8901725181420': ['Sunfeast YiPPee! Magic Masala 70g', 'Instant Food', 15, 8, 270, 1.5, 'fmcg'],
    '8901014003181': ['Top Ramen Curry Noodles 280g', 'Instant Food', 60, 3, 270, 0.4, 'fmcg'],
    '8901262010153': ['Amul Butter 100g', 'Dairy', 58, 8, 90, 2.5, 'dairy'],
    '8901262020244': ['Amul Cheese Slices 200g', 'Dairy', 150, 3, 60, 0.6, 'dairy'],
    '8901262150088': ['Amul Taaza Toned Milk 200ml', 'Dairy', 14, 15, 5, 6, 'dairy'],
    '8901262150989': ['Amul Gold Full Cream Milk 1L', 'Dairy', 77, 10, 5, 5, 'dairy'],
    '8901262031059': ['Amul Pure Ghee 500ml', 'Dairy', 315, 3, 270, 0.4, 'dairy'],
    '8901262151696': ['Amul Lassi 250ml', 'Dairy', 25, 8, 7, 2, 'dairy'],
    '8901262201995': ['Amul Masti Buttermilk 310ml', 'Dairy', 20, 8, 7, 2.5, 'dairy'],
    '8901648019718': ['Mother Dairy Cow Ghee 1L', 'Dairy', 640, 2, 270, 0.15, 'dairy'],
    '8904043926612': ['Tata Salt Himalayan Rock Salt 1kg', 'Grocery', 115, 3, 0, 0.3, 'fmcg'],
    '8901052003839': ['Tata Tea Agni 40g', 'Beverage', 12, 10, 365, 2, 'fmcg'],
    '8901052005161': ['Tata Tea Gold Care 500g', 'Beverage', 320, 3, 365, 0.4, 'fmcg'],
    '8901030876981': ['Brooke Bond Red Label 500g', 'Beverage', 290, 4, 365, 0.6, 'fmcg'],
    '8901030658761': ['Taj Mahal Tea 500g', 'Beverage', 365, 2, 365, 0.25, 'fmcg'],
    '8901030625381': ['Bru Instant Coffee 100g', 'Beverage', 225, 2, 365, 0.25, 'fmcg'],
    '8901058895322': ['Nescafe Sunrise 5.5g Sachet', 'Beverage', 5, 20, 365, 3, 'fmcg'],
    '8901233020341': ['Cadbury Bournvita 500g', 'Beverage', 245, 3, 365, 0.3, 'fmcg'],
    '8901571001354': ['Horlicks Classic Malt 150g', 'Beverage', 90, 3, 365, 0.25, 'fmcg'],
    '8901725118846': ['Aashirvaad Vermicelli 850g', 'Grocery', 95, 3, 270, 0.3, 'fmcg'],
    '8901725121112': ['Aashirvaad Shudh Chakki Atta 10kg', 'Grocery', 480, 4, 90, 0.7, 'fmcg'],
    '8906007280020': ['Fortune Sunlite Refined Sunflower Oil 500ml', 'Grocery', 85, 6, 270, 1.2, 'fmcg'],
    '8906007289139': ['Fortune Chakki Fresh Atta 1kg', 'Grocery', 55, 6, 90, 1.2, 'fmcg'],
    '8901786130504': ['Everest Kitchen King / Sabji Masala 10g', 'Spices', 10, 10, 365, 1.5, 'fmcg'],
    '8901786100507': ['Everest Garam Masala 50g', 'Spices', 42, 5, 365, 0.6, 'fmcg'],
    '8901786081004': ['Everest Sambhar Masala 100g', 'Spices', 78, 3, 365, 0.3, 'fmcg'],
    '8902167000836': ['MDH Chicken Masala 100g', 'Spices', 82, 3, 365, 0.4, 'fmcg'],
    '8902167001314': ['MDH Deggi Mirch 50g', 'Spices', 45, 4, 365, 0.5, 'fmcg'],
    '8901192213112': ['Catch Meat Masala 100g', 'Spices', 75, 2, 365, 0.25, 'fmcg'],
    '8904043926728': ['Tata Sampann Besan 500g', 'Grocery', 70, 4, 180, 0.8, 'fmcg'],
    '8904043926223': ['Tata Sampann Unpolished Toor Dal 500g', 'Grocery', 95, 4, 270, 0.7, 'fmcg'],
    '8906002348169': ['Rajdhani Poha Mota 500g', 'Grocery', 45, 4, 180, 1, 'grain'],
    '8901030857973': ['Kissan Peanut Butter Creamy 350g', 'Grocery', 160, 2, 270, 0.15, 'fmcg'],
    '8901058895766': ['Maggi Pichkoo Tomato Ketchup 90g', 'Grocery', 15, 8, 270, 1.5, 'fmcg'],
    '8901042957968': ['MTR Rava Dosa Mix 500g', 'Instant Food', 140, 2, 270, 0.2, 'fmcg'],
    '8901042967325': ['MTR Breakfast Poha Cup 60g', 'Instant Food', 45, 4, 270, 0.4, 'fmcg'],
    '8902579103170': ['Frooti Mango Drink 600ml', 'Beverage', 40, 6, 180, 1.5, 'bev'],
    '8901764092206': ['Maaza Original Mango 600ml', 'Beverage', 40, 6, 180, 1.2, 'bev'],
    '8901764042911': ['Thums Up 250ml', 'Beverage', 20, 12, 180, 3, 'bev'],
    '8901764032905': ['Sprite 2.25L', 'Beverage', 99, 3, 180, 0.6, 'bev'],
    '8902080104048': ['Pepsi 500ml', 'Beverage', 40, 6, 180, 1.2, 'bev'],
    '8908001705127': ['Paper Boat Jamun Kala Khatta 200ml', 'Beverage', 30, 4, 180, 0.5, 'bev'],
    '8906017290033': ['Bisleri Mineral Water 500ml', 'Beverage', 10, 24, 365, 5, 'bev'],
    '8901233030548': ['Cadbury Dairy Milk 13.2g', 'Confectionery', 10, 20, 270, 5, 'snack'],
    '8901233025636': ['Cadbury Dairy Milk 52g', 'Confectionery', 50, 6, 270, 1, 'snack'],
    '8901233028958': ['Cadbury 5 Star 12g', 'Confectionery', 5, 20, 270, 4, 'snack'],
    '8901058868036': ['Nestle KitKat 4 Finger 55g', 'Confectionery', 50, 5, 270, 0.8, 'snack'],
    '8901233024042': ['Cadbury Perk 13g', 'Confectionery', 10, 15, 270, 3, 'snack'],
    '8901058869002': ['Nestle Munch 12.5g', 'Confectionery', 10, 15, 270, 3, 'snack'],
    '8901088050562': ['Saffola Masala Oats 400g', 'Breakfast', 199, 2, 270, 0.15, 'fmcg'],
    '8901491103794': ['Quaker Oats 400g', 'Breakfast', 99, 2, 270, 0.2, 'fmcg'],
    '8901207872624': ['Dabur Honey 650g', 'Grocery', 260, 2, 540, 0.15, 'fmcg'],
    '8904109470264': ['Patanjali Mango Drink 500ml', 'Beverage', 30, 4, 180, 0.4, 'bev'],
    '8901314765314': ['Colgate Strong Teeth 200g', 'Personal Care', 115, 5, 730, 0.6, 'fmcg'],
    '8901030824968': ['Dove Cream Beauty Bathing Bar 125g', 'Personal Care', 70, 5, 730, 0.5, 'fmcg'],
    '8901030886126': ['Lux Soft Glow Soap 4x125g', 'Personal Care', 165, 3, 730, 0.3, 'fmcg'],
    '8901396387701': ['Dettol Original Handwash Refill', 'Personal Care', 99, 3, 730, 0.25, 'fmcg'],
    '8901088047142': ['Parachute Coconut Oil 100ml', 'Personal Care', 52, 5, 540, 0.7, 'fmcg'],
    '8901030984709': ['Clinic Plus Strength & Shine Shampoo 50ml', 'Personal Care', 35, 6, 730, 0.6, 'fmcg'],
    '8901030898440': ['Surf Excel Easy Wash 75g', 'Household', 10, 20, 0, 3, 'fmcg'],
    '8901030889875': ['Vim Lemon Dishwash Gel 140ml', 'Household', 30, 6, 0, 1, 'fmcg'],
    '8901396173595': ['Harpic Power Plus Toilet Cleaner 1L', 'Household', 210, 2, 0, 0.2, 'fmcg'],
};

// Loose goods sold by the kg — no barcode, batch no or expiry (schema v5 rule).
const LOOSE = [
    // [name, category, price/kg, reorder kg, avg kg/day]
    ['Sugar (loose)', 'Grocery', 46, 15, 6],
    ['Kolam Rice (loose)', 'Grocery', 62, 20, 7],
    ['Toor Dal (loose)', 'Grocery', 150, 8, 2.5],
    ['Moong Dal (loose)', 'Grocery', 130, 5, 1.2],
    ['Chana Dal (loose)', 'Grocery', 95, 5, 1.2],
    ['Jaggery / Gul (loose)', 'Grocery', 60, 5, 1],
    ['Groundnut / Shengdana (loose)', 'Grocery', 140, 4, 0.8],
    ['Sabudana (loose)', 'Grocery', 85, 4, 0.8],
];

// Products deliberately left un-restocked in the last week so the reorder
// screen has real low-stock items to show.
const STARVE = new Set(['8901719100956', '8901262010153', '8906007280020', '8901233030548', 'Toor Dal (loose)']);

// Morning shoppers want milk, bread and tea; evenings skew to snacks.
const MORNING_BOOST = new Set(['Dairy', 'Bakery', 'Beverage']);
const EVENING_BOOST = new Set(['Snack', 'Confectionery', 'Instant Food']);

// ── Customers ─────────────────────────────────────────────────────────────────
// [name, address, visits/week, khata?]  — phones are generated (see below).
const CUSTOMERS = [
    ['Sunil Kulkarni', 'Flat 302, B Wing, Sai Krupa Apts', 5, true],
    ['Vaishali Deshpande', 'Sai Krupa Apts, A Wing', 6, true],
    ['Mahesh Jadhav', 'Rambaug Colony, Lane 3', 4, true],
    ['Anita Shinde', 'Shivtirth Nagar', 4, true],
    ['Rohit Patil', 'Mayur Colony', 3, true],
    ['Kavita Joshi', 'Ideal Colony', 3, true],
    ['Prakash More', 'Paud Road, near Vanaz', 3, true],
    ['Lata Gaikwad', 'Shastri Nagar', 2, true],
    ['Neha Kapoor', 'Gandhi Bhavan Rd', 5, false],
    ['Aditya Sawant', 'Karve Nagar', 4, false],
    ['Pooja Agarwal', 'Mahatma Society', 3, false],
    ['Rajesh Gupta', 'Kothrud Depot', 3, false],
    ['Sneha Bhosale', 'Sai Krupa Apts, C Wing', 4, false],
    ['Vikram Rathod', 'Dahanukar Colony', 2, false],
    ['Meera Iyer', 'Bhusari Colony', 2, false],
    ['Arjun Mehta', 'Mayur Colony', 2, false],
    ['Swati Kale', 'Ideal Colony', 2, false],
    ['Imran Shaikh', 'Shastri Nagar', 2, false],
    ['Nikhil Chavan', 'Hill View Society', 1.5, false],
    ['Priyanka Mane', 'Rambaug Colony', 1.5, false],
    ['Santosh Pawar', 'Vanaz Corner', 1, false],
    ['Deepa Nair', 'Karve Road', 1, false],
    ['Ganesh Waghmare', 'Paud Phata', 1, false],
    ['Rekha Sharma', 'Mahatma Society', 1, false],
    ['Amol Thorat', 'PG near MIT College', 1, false],
    ['Shraddha Kulkarni', 'PG near MIT College', 0.8, false],
    ['Harish Reddy', 'Dahanukar Colony', 0.5, false],
    ['Tanvi Desai', 'Gandhi Bhavan Rd', 0.5, false],
    ['Yogesh Salunkhe', 'Kothrud Depot', 0.3, false],   // came once, weeks ago → dormant
    ['Farah Khan', 'Bhusari Colony', 0, false],         // added to directory, no purchase yet → new
];

// ── Simulation ────────────────────────────────────────────────────────────────
function buildData() {
    const rows = {
        suppliers: [], products: [], batches: [], txns: [], customers: [],
        orders: [], items: [], ledger: [], pos: [],
    };
    const supplierIds = {};
    for (const [key, s] of Object.entries(SUPPLIERS)) {
        supplierIds[key] = uuidv4();
        rows.suppliers.push({ id: supplierIds[key], name: s.name, phone: s.phone, note: s.note, updated_at: todayIst - DAYS * DAY });
    }

    const products = [];
    for (const [barcode, [name, category, mrp, reorder, shelf, velocity, sup]] of Object.entries(CATALOG)) {
        products.push({ id: uuidv4(), key: barcode, barcode, name, category, brand: brandOf(barcode), unit: 'pcs',
            price: mrp, cost: round2(mrp * (category === 'Dairy' ? 0.9 : 0.86 - rand() * 0.06)), reorder, shelf, velocity, sup, batches: [] });
    }
    for (const [name, category, price, reorder, velocity] of LOOSE) {
        products.push({ id: uuidv4(), key: name, barcode: null, name, category, brand: null, unit: 'kg',
            price, cost: round2(price * 0.85), reorder, shelf: 0, velocity, sup: 'grain', batches: [] });
    }

    const customers = CUSTOMERS.map(([name, address, perWeek, khata], i) => ({
        id: uuidv4(), name, address, perWeek, khata,
        phone: '70' + String(20000000 + i * 137 + 4011).slice(0, 8),   // 70xxxxxxxx — fake range, won't reach real people
        balance: 0, last: null, createdDaysAgo: perWeek === 0 ? 3 : randInt(DAYS, DAYS + 60),
    }));

    let batchSeq = 1;
    function receive(p, qty, at, supplierId) {
        const b = { id: uuidv4(), product: p, qty, at,
            batch_no: p.barcode ? `${p.name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')}-${String(batchSeq++).padStart(4, '0')}` : null,
            expiry: p.shelf ? at + (p.shelf + randInt(-1, 2)) * DAY : null, supplierId };
        p.batches.push(b);
        rows.txns.push({ product_id: p.id, batch_id: b.id, type: 'stock_in', quantity: qty, txn_at: at });
        return b;
    }
    const stockOf = p => p.batches.reduce((s, b) => s + b.qty, 0);

    // Opening stock, received the day before the window starts.
    const openingAt = todayIst - (DAYS + 1) * DAY + 9 * HOUR;
    for (const p of products) {
        const days = p.category === 'Dairy' && p.shelf < 10 ? 2 : 12;
        receive(p, Math.max(p.reorder + 2, Math.ceil(p.velocity * days * 1.2)), openingAt, supplierIds[p.sup]);
    }

    for (let d = DAYS; d >= 0; d--) {
        const dayStart = todayIst - d * DAY;
        const dow = new Date(dayStart + IST).getUTCDay(); // 0 = Sunday

        // Supplier deliveries (morning) — and write off anything expired first.
        for (const [key, s] of Object.entries(SUPPLIERS)) {
            if ((DAYS - d) % s.every !== s.offset % s.every) continue;
            const deliverAt = dayStart + (key === 'dairy' ? 6.5 : 11) * HOUR + randInt(0, 40) * 60000;
            const lines = [];
            for (const p of products.filter(x => x.sup === key)) {
                for (const b of p.batches) {
                    if (b.expiry && b.expiry < deliverAt && b.qty > 0) {
                        rows.txns.push({ product_id: p.id, batch_id: b.id, type: 'wastage', quantity: b.qty, txn_at: deliverAt - 5 * 60000 });
                        b.qty = 0;
                    }
                }
                if (STARVE.has(p.key) && d <= 12) continue;
                const cover = p.shelf && p.shelf < 10 ? 2.2 : 9;
                const target = Math.ceil(p.velocity * cover * 1.25) + p.reorder;
                const have = stockOf(p);
                if (have < p.reorder + p.velocity * (p.shelf && p.shelf < 10 ? 1 : 5)) {
                    const qty = Math.max(1, target - have);
                    receive(p, qty, deliverAt, supplierIds[key]);
                    lines.push({ product_id: p.id, name: p.name, quantity: qty });
                }
            }
            if (lines.length && key !== 'dairy') {
                rows.pos.push({ id: uuidv4(), supplier_id: supplierIds[key], status: 'received', items_json: JSON.stringify(lines),
                    note: 'Received in full', ordered_at: deliverAt - randInt(1, 2) * DAY });
            }
        }

        // Footfall.
        let n = 38 * [1.35, 0.92, 0.95, 0.97, 1.0, 1.08, 1.18][dow] * (0.85 + rand() * 0.3);
        if (d === 0) n *= Math.min(1, Math.max(0, ((now + IST) % DAY) / DAY - 0.29) / 0.62); // today, only up to now
        const orderCount = Math.round(n);
        const times = [];
        for (let i = 0; i < orderCount; i++) {
            const h = chance(0.42) ? 7 + rand() * 4 : chance(0.7) ? 17 + rand() * 4.5 : 11 + rand() * 6;
            const t = Math.round(dayStart + h * HOUR);   // BIGINT columns reject fractional ms
            if (t < now - 2 * 60000) times.push(t);
        }
        times.sort((a, b) => a - b);

        for (const t of times) {
            const hour = ((t + IST) % DAY) / HOUR;
            const morning = hour < 11;
            const evening = hour >= 17;

            // Who is buying? Regulars by visit frequency; ~55% walk-ins.
            let customer = null;
            if (chance(0.45)) {
                const pool = customers.filter(c => c.perWeek > 0 && !(c.perWeek < 0.5 && d < DAYS - 4));
                customer = weighted(pool, c => c.perWeek);
            }

            // Basket.
            const lines = new Map();
            const size = Math.min(8, 1 + Math.floor(-Math.log(1 - rand()) * (customer ? 2.4 : 1.4)));
            for (let k = 0; k < size; k++) {
                const p = weighted(products, x => x.velocity *
                    (morning && MORNING_BOOST.has(x.category) ? 2 : 1) * (evening && EVENING_BOOST.has(x.category) ? 1.6 : 1));
                const qty = p.unit === 'kg' ? randInt(1, chance(0.2) ? 5 : 2) : (p.price <= 20 && chance(0.35) ? randInt(2, 4) : 1);
                lines.set(p, (lines.get(p) || 0) + qty);
            }

            const orderId = uuidv4();
            let total = 0;
            const orderItems = [];
            for (const [p, want] of lines) {
                let left = Math.min(want, stockOf(p));
                // FEFO: oldest expiry first, then oldest receipt
                const batches = p.batches.filter(b => b.qty > 0 && (!b.expiry || b.expiry > t))
                    .sort((a, b) => (a.expiry || Infinity) - (b.expiry || Infinity) || a.at - b.at);
                for (const b of batches) {
                    if (left <= 0) break;
                    const take = Math.min(left, b.qty);
                    b.qty -= take; left -= take;
                    orderItems.push({ order_id: orderId, product_id: p.id, batch_id: b.id, quantity: take, unit_price: p.price });
                    rows.txns.push({ product_id: p.id, batch_id: b.id, type: 'sale', quantity: take, txn_at: t });
                    total += take * p.price;
                }
            }
            if (!orderItems.length) continue; // everything they wanted was out of stock

            let mode = chance(0.62) ? 'upi' : 'cash';
            if (customer && customer.khata && chance(0.55)) mode = 'credit';
            if (total < 30 && mode === 'upi' && chance(0.5)) mode = 'cash';

            rows.orders.push({ id: orderId, customer_id: customer ? customer.id : null, total_amount: total, payment_mode: mode, sale_at: t });
            rows.items.push(...orderItems);
            if (customer) customer.last = t;
            if (mode === 'credit') {
                customer.balance += total;
                rows.ledger.push({ customer_id: customer.id, order_id: orderId, type: 'credit_sale', amount: total, note: '', entry_at: t });
            }
        }

        // Khata repayments: salaried regulars settle around the 1st and mid-month,
        // others drop a round amount when the balance gets uncomfortable.
        for (const c of customers.filter(x => x.khata && x.balance > 0)) {
            const payday = d === DAYS - 5 || d === DAYS - 19;
            if ((payday && chance(0.7)) || (c.balance > 1500 && chance(0.25))) {
                const amt = Math.min(c.balance, Math.max(100, Math.round(c.balance * (0.5 + rand() * 0.5) / 100) * 100));
                const at = dayStart + randInt(18, 21) * HOUR;
                if (at > now) continue;
                c.balance -= amt;
                rows.ledger.push({ customer_id: c.id, order_id: null, type: 'repayment', amount: amt,
                    note: chance(0.5) ? 'UPI' : 'Cash', entry_at: at });
            }
        }
    }

    // ── v1.2 features, so every screen has something to show ──────────────────
    // Two wrong bills voided a few days ago (one cash, one khata): the items go
    // back on their batches as 'return' rows and the khata gets the reversal.
    const batchById = new Map(products.flatMap(p => p.batches.map(b => [b.id, b])));
    const voidable = mode => rows.orders.find(o => o.payment_mode === mode && !o.voided_at &&
        o.sale_at < todayIst - 2 * DAY && o.sale_at > todayIst - 6 * DAY);
    for (const order of [voidable('cash'), voidable('credit')].filter(Boolean)) {
        order.voided_at = order.sale_at + 20 * 60000;
        for (const it of rows.items.filter(i => i.order_id === order.id)) {
            batchById.get(it.batch_id).qty += it.quantity;
            rows.txns.push({ product_id: it.product_id, batch_id: it.batch_id, type: 'return', quantity: it.quantity, txn_at: order.voided_at });
        }
        if (order.payment_mode === 'credit') {
            const c = customers.find(x => x.id === order.customer_id);
            c.balance -= order.total_amount;
            rows.ledger.push({ customer_id: c.id, order_id: order.id, type: 'repayment', amount: order.total_amount,
                note: 'Bill voided', entry_at: order.voided_at });
        }
    }

    // Slowest movers still in stock: two put on sale (one ends in 5 days),
    // and the very slowest discontinued (archived) by the owner.
    const slow = products.filter(p => stockOf(p) > 0).sort((a, b) => a.velocity - b.velocity);
    slow[0].archived_at = todayIst - 3 * DAY;
    for (const [p, until] of [[slow[1], null], [slow[2], todayIst + 5 * DAY]]) {
        p.regular_price = p.price;
        p.sale_price = Math.max(Math.ceil(p.cost * 1.05), Math.round(p.price * 0.85));
        p.sale_until = until;
    }

    // A one-time customer the shopkeeper tidied away.
    const oneOff = customers.find(c => !c.khata && c.perWeek === 0);
    if (oneOff) oneOff.archived_at = todayIst - DAY;

    // One perishable batch left expired on the shelf on purpose (live "mark wasted" demo).
    const bread = products.find(p => p.barcode === '8901063342033');
    const stale = receive(bread, 3, todayIst - 6 * DAY + 7 * HOUR, supplierIds.dairy);
    stale.expiry = todayIst - 2 * DAY;

    // Open purchase orders for what's running low right now.
    const low = products.filter(p => stockOf(p) <= p.reorder);
    const bySup = {};
    for (const p of low) (bySup[p.sup] = bySup[p.sup] || []).push({ product_id: p.id, name: p.name, quantity: Math.ceil(p.velocity * 10) + p.reorder });
    let first = true;
    for (const [key, lines] of Object.entries(bySup)) {
        rows.pos.push({ id: uuidv4(), supplier_id: supplierIds[key], status: first ? 'sent' : 'draft', items_json: JSON.stringify(lines),
            note: first ? 'Sent on WhatsApp' : null, ordered_at: now - (first ? 3 : 1) * HOUR });
        first = false;
    }

    for (const p of products) {
        rows.products.push(p);
        for (const b of p.batches) rows.batches.push(b);
    }
    rows.customers = customers;
    return rows;
}

function brandOf(barcode) {
    const name = CATALOG[barcode][0];
    const known = ['Parle', 'Britannia', 'Sunfeast', "Haldiram's", 'Bikaji', "Lay's", 'Kurkure', 'Uncle Chipps', 'Maggi', 'Top Ramen',
        'Amul', 'Mother Dairy', 'Tata Salt', 'Tata Tea', 'Brooke Bond', 'Taj Mahal', 'Bru', 'Nescafe', 'Cadbury', 'Horlicks', 'Aashirvaad',
        'Fortune', 'Everest', 'MDH', 'Catch', 'Tata Sampann', 'Rajdhani', 'Kissan', 'MTR', 'Frooti', 'Maaza', 'Thums Up', 'Sprite',
        'Pepsi', 'Paper Boat', 'Bisleri', 'Nestle', 'Saffola', 'Quaker', 'Dabur', 'Patanjali', 'Colgate', 'Dove', 'Lux', 'Dettol',
        'Parachute', 'Clinic Plus', 'Surf Excel', 'Vim', 'Harpic'];
    return known.find(b => name.startsWith(b)) || name.split(' ')[0];
}

const round2 = x => Math.round(x * 100) / 100;

// ── DB writes ─────────────────────────────────────────────────────────────────
async function insertMany(client, table, cols, data) {
    for (let i = 0; i < data.length; i += 400) {
        const chunk = data.slice(i, i + 400);
        const params = [];
        const values = chunk.map(r => `(${cols.map(c => { params.push(r[c]); return '$' + params.length; }).join(',')})`);
        await client.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${values.join(',')}`, params);
    }
}

async function resetBusinessData(client, businessId) {
    console.log(`[kirana] Resetting existing data for business ${businessId}`);
    await client.query(`DELETE FROM ledger_entries WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM sale_items si USING sale_orders so WHERE si.order_id = so.id AND so.business_id = $1`, [businessId]);
    await client.query(`DELETE FROM stock_transactions st USING products p WHERE st.product_id = p.id AND p.business_id = $1`, [businessId]);
    await client.query(`DELETE FROM stock_batches sb USING products p WHERE sb.product_id = p.id AND p.business_id = $1`, [businessId]);
    await client.query(`DELETE FROM sale_orders WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM purchase_orders WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM customers WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM products WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM suppliers WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM staff WHERE business_id = $1`, [businessId]);
    await client.query(`DELETE FROM voice_usage WHERE business_id = $1`, [businessId]);
}

async function write(rows) {
    const { pool } = require('../db/pool');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let { rows: found } = await client.query('SELECT id FROM businesses WHERE phone = $1', [BUSINESS.phone]);
        let businessId = found[0] && found[0].id;
        if (businessId && !shouldReset) throw new Error(`${BUSINESS.phone} already exists — re-run with --reset to rebuild it`);
        if (businessId) {
            await resetBusinessData(client, businessId);
            await client.query('UPDATE businesses SET name=$2, upi_id=$3, address=$4, gstin=$5 WHERE id=$1',
                [businessId, BUSINESS.name, BUSINESS.upi_id, BUSINESS.address, BUSINESS.gstin]);
        } else {
            businessId = uuidv4();
            await client.query(
                `INSERT INTO businesses (id, name, type, phone, password_hash, upi_id, address, gstin, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [businessId, BUSINESS.name, BUSINESS.type, BUSINESS.phone, await bcrypt.hash(BUSINESS.password, 12),
                    BUSINESS.upi_id, BUSINESS.address, BUSINESS.gstin, new Date(todayIst - (DAYS + 45) * DAY)]);
        }
        for (const s of STAFF) {
            await client.query('INSERT INTO staff (business_id, name, phone, password_hash) VALUES ($1,$2,$3,$4)',
                [businessId, s.name, s.phone, await bcrypt.hash(s.password, 12)]);
        }

        const b = r => ({ ...r, business_id: businessId, sync_status: 'synced' });
        await insertMany(client, 'suppliers', ['id', 'business_id', 'name', 'phone', 'note', 'sync_status', 'updated_at'], rows.suppliers.map(b));
        await insertMany(client, 'products',
            ['id', 'business_id', 'name', 'category', 'barcode', 'brand', 'unit', 'reorder_level', 'schedule_h', 'selling_price',
                'regular_price', 'sale_until', 'archived_at', 'sync_status', 'updated_at', 'created_at'],
            rows.products.map(p => b({ ...p, reorder_level: p.reorder, schedule_h: false, selling_price: p.sale_price ?? p.price,
                regular_price: p.regular_price ?? null, sale_until: p.sale_until ?? null, archived_at: p.archived_at ?? null,
                updated_at: todayIst - DAYS * DAY, created_at: new Date(todayIst - (DAYS + 40) * DAY) })));
        await insertMany(client, 'stock_batches',
            ['id', 'product_id', 'quantity', 'batch_no', 'expiry_date', 'cost_price', 'supplier_id', 'sync_status', 'created_at', 'updated_at'],
            rows.batches.map(x => ({ id: x.id, product_id: x.product.id, quantity: x.qty, batch_no: x.batch_no, expiry_date: x.expiry,
                cost_price: x.product.cost, supplier_id: x.supplierId, sync_status: 'synced', created_at: x.at, updated_at: x.at })));
        await insertMany(client, 'customers',
            ['id', 'business_id', 'name', 'phone', 'address', 'segment', 'last_purchase_at', 'archived_at', 'sync_status', 'updated_at', 'created_at'],
            rows.customers.map(c => b({ ...c, segment: 'new', last_purchase_at: c.last, archived_at: c.archived_at ?? null, updated_at: c.last || now,
                created_at: new Date(todayIst - c.createdDaysAgo * DAY) })));
        await insertMany(client, 'sale_orders', ['id', 'business_id', 'customer_id', 'total_amount', 'payment_mode', 'sale_at', 'voided_at', 'sync_status', 'updated_at'],
            rows.orders.map(o => b({ ...o, voided_at: o.voided_at ?? null, updated_at: o.voided_at || o.sale_at })));
        await insertMany(client, 'sale_items', ['id', 'order_id', 'product_id', 'batch_id', 'quantity', 'unit_price', 'updated_at'],
            rows.items.map(i => ({ ...i, id: uuidv4(), updated_at: now })));
        await insertMany(client, 'stock_transactions', ['id', 'product_id', 'batch_id', 'type', 'quantity', 'txn_at', 'sync_status', 'updated_at'],
            rows.txns.map(t => ({ ...t, id: uuidv4(), sync_status: 'synced', updated_at: t.txn_at })));
        await insertMany(client, 'ledger_entries', ['id', 'business_id', 'customer_id', 'order_id', 'type', 'amount', 'note', 'entry_at', 'sync_status', 'updated_at'],
            rows.ledger.map(l => b({ ...l, id: uuidv4(), updated_at: l.entry_at })));
        await insertMany(client, 'purchase_orders', ['id', 'business_id', 'supplier_id', 'status', 'items_json', 'note', 'ordered_at', 'sync_status', 'updated_at'],
            rows.pos.map(p => b({ ...p, updated_at: p.ordered_at })));
        for (let d = 13; d >= 0; d--) {
            if (!chance(0.6)) continue;
            const day = new Date(todayIst - d * DAY + IST).toISOString().slice(0, 10);
            await client.query('INSERT INTO voice_usage (business_id, day, count) VALUES ($1,$2,$3)', [businessId, day, randInt(2, 14)]);
        }
        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
        await pool.end();
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
function summary(rows) {
    const inr = x => '₹' + Math.round(x).toLocaleString('en-IN');
    const revenue = rows.orders.filter(o => !o.voided_at).reduce((s, o) => s + o.total_amount, 0);
    const byMode = m => rows.orders.filter(o => o.payment_mode === m).length;
    const owed = rows.customers.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance);
    const stock = p => p.batches.reduce((s, b) => s + b.qty, 0);
    const low = rows.products.filter(p => stock(p) <= p.reorder);
    const soon = rows.batches.filter(b => b.expiry && b.qty > 0 && b.expiry > now && b.expiry < now + 3 * DAY);
    const todays = rows.orders.filter(o => o.sale_at >= todayIst);
    console.log(`  Products:        ${rows.products.length} (${rows.products.filter(p => p.barcode).length} with real OFF barcodes)`);
    console.log(`  Orders:          ${rows.orders.length}  (cash ${byMode('cash')}, upi ${byMode('upi')}, credit ${byMode('credit')})`);
    console.log(`  Revenue (28d):   ${inr(revenue)}   avg bill ${inr(revenue / rows.orders.length)}`);
    console.log(`  Today so far:    ${todays.length} bills, ${inr(todays.reduce((s, o) => s + o.total_amount, 0))}`);
    console.log(`  Wastage rows:    ${rows.txns.filter(t => t.type === 'wastage').length}`);
    console.log(`  Low stock:       ${low.map(p => `${p.name} (${stock(p)})`).join(', ')}`);
    console.log(`  Expiring ≤3d:    ${soon.map(b => `${b.product.name} ×${b.qty}`).join(', ') || '—'}`);
    console.log(`  Khata owed:      ${owed.map(c => `${c.name} ${inr(c.balance)}`).join(', ')}`);
    console.log(`  Purchase orders: ${rows.pos.length}`);
    console.log(`  Voided bills:    ${rows.orders.filter(o => o.voided_at).length}`);
    console.log(`  On sale:         ${rows.products.filter(p => p.regular_price).map(p => `${p.name} ₹${p.regular_price}→₹${p.sale_price}`).join(', ')}`);
    console.log(`  Archived:        ${rows.products.filter(p => p.archived_at).map(p => p.name).join(', ')}; customer ${rows.customers.filter(c => c.archived_at).map(c => c.name).join(', ') || '—'}`);
}

async function main() {
    const rows = buildData();
    console.log(`\n[kirana] ${BUSINESS.name} — simulated ${DAYS + 1} days${dryRun ? ' (dry run, nothing written)' : ''}\n`);
    summary(rows);
    if (dryRun) return;
    await write(rows);
    console.log('\n[kirana] Written.');
    console.log(`  Owner login:  ${BUSINESS.phone} / ${BUSINESS.password}`);
    console.log(`  Staff login:  ${STAFF[0].phone} / ${STAFF[0].password}`);
}

if (require.main === module) {
    main().catch(e => { console.error('[kirana] Failed:', e); process.exitCode = 1; });
}
