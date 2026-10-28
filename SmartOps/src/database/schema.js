import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 6,
    tables: [

        tableSchema({
            name: 'products',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'category', type: 'string' },
                { name: 'barcode', type: 'string', isIndexed: true },
                { name: 'brand', type: 'string' },
                { name: 'unit', type: 'string' },
                { name: 'reorder_level', type: 'number' },
                { name: 'schedule_h', type: 'boolean' },
                { name: 'selling_price', type: 'number' },
                { name: 'archived_at', type: 'number', isOptional: true },
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'stock_batches',
            columns: [
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'quantity', type: 'number' },
                // Optional since v5: loose goods (rice, sugar) have neither.
                // Pharmacies still must fill both — enforced in the Stock In screen.
                { name: 'batch_no', type: 'string', isOptional: true },
                { name: 'expiry_date', type: 'number', isOptional: true },
                { name: 'cost_price', type: 'number' },
                { name: 'supplier_id', type: 'string', isOptional: true },
                { name: 'sync_status', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'stock_transactions',
            columns: [
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'batch_id', type: 'string', isIndexed: true },
                { name: 'type', type: 'string' },
                { name: 'quantity', type: 'number' },
                { name: 'txn_at', type: 'number' },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'sale_orders',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'customer_id', type: 'string', isOptional: true },
                { name: 'total_amount', type: 'number' },
                { name: 'payment_mode', type: 'string' },
                { name: 'sale_at', type: 'number' },
                { name: 'voided_at', type: 'number', isOptional: true },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'sale_items',
            columns: [
                { name: 'order_id', type: 'string', isIndexed: true },
                { name: 'product_id', type: 'string' },
                { name: 'batch_id', type: 'string' },
                { name: 'quantity', type: 'number' },
                { name: 'unit_price', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'customers',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                // Optional — only load-bearing for khata (need someone to contact
                // for an unpaid balance). A cash/UPI-only customer can be name-only.
                { name: 'phone', type: 'string', isIndexed: true, isOptional: true },
                // Free text ("Sunrise Society", "Flat 302") — doubles as the
                // disambiguator shown under a name in the customer search.
                { name: 'address', type: 'string', isOptional: true },
                { name: 'segment', type: 'string' },
                { name: 'last_purchase_at', type: 'number' },
                { name: 'archived_at', type: 'number', isOptional: true },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'ledger_entries',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'customer_id', type: 'string', isIndexed: true },
                { name: 'order_id', type: 'string', isOptional: true },
                { name: 'type', type: 'string' },        // 'credit_sale' | 'repayment'
                { name: 'amount', type: 'number' },
                { name: 'note', type: 'string', isOptional: true },
                { name: 'entry_at', type: 'number' },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'suppliers',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'phone', type: 'string', isOptional: true },
                { name: 'note', type: 'string', isOptional: true },
                { name: 'archived_at', type: 'number', isOptional: true },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

        tableSchema({
            name: 'purchase_orders',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'supplier_id', type: 'string', isOptional: true, isIndexed: true },
                { name: 'status', type: 'string' },          // draft | sent | received | cancelled
                { name: 'items_json', type: 'string' },      // [{ product_id, name, quantity }]
                { name: 'note', type: 'string', isOptional: true },
                { name: 'ordered_at', type: 'number' },
                { name: 'sync_status', type: 'string' },
                { name: 'updated_at', type: 'number' },
            ],
        }),

    ],
});