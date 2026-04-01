import { appSchema, tableSchema } from '@nozbe/watermelondb';

export default appSchema({
    version: 1,
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
                { name: 'batch_no', type: 'string' },
                { name: 'expiry_date', type: 'number' },
                { name: 'cost_price', type: 'number' },
                { name: 'sync_status', type: 'string' },
                { name: 'created_at', type: 'number' },
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
                { name: 'sync_status', type: 'string' },
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
            ],
        }),

        tableSchema({
            name: 'customers',
            columns: [
                { name: 'business_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'phone', type: 'string', isIndexed: true },
                { name: 'segment', type: 'string' },
                { name: 'last_purchase_at', type: 'number' },
                { name: 'sync_status', type: 'string' },
            ],
        }),

    ],
});