// Pulls real Indian packaged goods from Open Food Facts for the demo kirana
// seed. Every barcode written out is a real EAN-13 that exists in OFF, so
// scanning the physical pack in the app finds it.
//
// Uses search.openfoodfacts.org (the classic /cgi/search.pl API is frequently
// down). Output is cached to src/scripts/data/off_products.json so the seed
// never depends on OFF being up during a demo.
//
// Run with: node src/scripts/fetch_off_products.js

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'data', 'off_products.json');
const UA = 'SmartOpsDemoSeed/1.0 (capstone project)';

// query → app category. Picks up to `take` distinct products per query.
const QUERIES = [
    ['parle-g', 'Snack', 2], ['parle monaco', 'Snack', 1], ['parle hide seek', 'Snack', 1],
    ['britannia good day', 'Snack', 2], ['britannia marie gold', 'Snack', 1], ['britannia bread', 'Bakery', 1],
    ['sunfeast', 'Snack', 2], ['oreo', 'Snack', 1], ['haldiram', 'Snack', 4], ['bikaji', 'Snack', 2],
    ['lays', 'Snack', 3], ['kurkure', 'Snack', 2], ['bingo', 'Snack', 1], ['uncle chips', 'Snack', 1],
    ['maggi', 'Instant Food', 3], ['yippee', 'Instant Food', 1], ['top ramen', 'Instant Food', 1],
    ['amul butter', 'Dairy', 1], ['amul cheese', 'Dairy', 1], ['amul taaza', 'Dairy', 1], ['amul gold', 'Dairy', 1],
    ['amul ghee', 'Dairy', 1], ['amul lassi', 'Dairy', 1], ['amul buttermilk', 'Dairy', 1], ['mother dairy', 'Dairy', 1],
    ['tata salt', 'Grocery', 1], ['tata tea', 'Beverage', 2], ['red label', 'Beverage', 1], ['taj mahal tea', 'Beverage', 1],
    ['bru coffee', 'Beverage', 1], ['nescafe', 'Beverage', 1], ['bournvita', 'Beverage', 1], ['horlicks', 'Beverage', 1],
    ['aashirvaad', 'Grocery', 2], ['fortune oil', 'Grocery', 1], ['saffola', 'Grocery', 1], ['fortune', 'Grocery', 1],
    ['everest masala', 'Spices', 3], ['mdh', 'Spices', 2], ['catch', 'Spices', 1],
    ['tata sampann', 'Grocery', 2], ['rajdhani', 'Grocery', 1],
    ['kissan', 'Grocery', 2], ['maggi ketchup', 'Grocery', 1], ['mtr', 'Instant Food', 2],
    ['frooti', 'Beverage', 1], ['maaza', 'Beverage', 1], ['thums up', 'Beverage', 1], ['sprite', 'Beverage', 1],
    ['coca cola', 'Beverage', 1], ['pepsi', 'Beverage', 1], ['real juice', 'Beverage', 1], ['paper boat', 'Beverage', 1],
    ['bisleri', 'Beverage', 1], ['cadbury dairy milk', 'Confectionery', 2], ['5 star', 'Confectionery', 1],
    ['kitkat', 'Confectionery', 1], ['perk', 'Confectionery', 1], ['munch', 'Confectionery', 1],
    ['kellogg', 'Breakfast', 1], ['saffola oats', 'Breakfast', 1], ['quaker oats', 'Breakfast', 1],
    ['dabur honey', 'Grocery', 1], ['patanjali', 'Grocery', 2],
    ['colgate', 'Personal Care', 2], ['pepsodent', 'Personal Care', 1], ['dove', 'Personal Care', 1],
    ['lifebuoy', 'Personal Care', 1], ['lux', 'Personal Care', 1], ['dettol', 'Personal Care', 1],
    ['parachute', 'Personal Care', 1], ['clinic plus', 'Personal Care', 1],
    ['surf excel', 'Household', 1], ['tide', 'Household', 1], ['vim', 'Household', 1], ['harpic', 'Household', 1],
];

const isIndianEan = code => /^890\d{10}$/.test(code || '');

async function search(q) {
    const url = `https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=40` +
        '&fields=code,product_name,product_name_en,brands,quantity,countries_tags';
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${q}: HTTP ${res.status}`);
    return (await res.json()).hits || [];
}

async function main() {
    const seen = new Set();
    const out = [];
    for (const [q, category, take] of QUERIES) {
        let hits;
        try { hits = await search(q); } catch (e) { console.warn('  !', e.message); continue; }
        const firstWord = q.split(' ')[0].replace(/-.*/, '');
        const picked = hits.filter(h => {
            const name = (h.product_name_en || h.product_name || '').trim();
            const brand = [].concat(h.brands || []).join(' ');
            return isIndianEan(h.code) && name.length > 2 && h.quantity &&
                !seen.has(h.code) && (name + ' ' + brand).toLowerCase().includes(firstWord);
        }).slice(0, take);
        for (const h of picked) {
            seen.add(h.code);
            out.push({
                barcode: h.code,
                name: (h.product_name_en || h.product_name).trim(),
                brand: [].concat(h.brands || [])[0] || null,
                quantity: String(h.quantity).trim(),
                category,
                query: q,
            });
        }
        console.log(`  ${q.padEnd(22)} ${picked.length}/${take}`);
        await new Promise(r => setTimeout(r, 300)); // be polite to OFF
    }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`\nWrote ${out.length} products → ${OUT}`);
}

main();
