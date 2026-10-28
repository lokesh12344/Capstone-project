import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

// WatermelonDB applies these steps in order to bring an existing on-device
// database up to the current schema version WITHOUT destroying local data.
// Each `toVersion` block runs only on devices currently below that version.
export default schemaMigrations({
    migrations: [
        {
            // v2 -> v3: introduce the khata (customer credit) ledger.
            toVersion: 3,
            steps: [
                createTable({
                    name: 'ledger_entries',
                    columns: [
                        { name: 'business_id', type: 'string', isIndexed: true },
                        { name: 'customer_id', type: 'string', isIndexed: true },
                        { name: 'order_id', type: 'string', isOptional: true },
                        { name: 'type', type: 'string' },
                        { name: 'amount', type: 'number' },
                        { name: 'note', type: 'string', isOptional: true },
                        { name: 'entry_at', type: 'number' },
                        { name: 'sync_status', type: 'string' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            // v3 -> v4: customer address (also doubles as the search disambiguator),
            // and phone becomes optional (enforced in app logic, not schema — a
            // cash/UPI-only customer no longer needs a phone number on file).
            toVersion: 4,
            steps: [
                addColumns({
                    table: 'customers',
                    columns: [
                        { name: 'address', type: 'string', isOptional: true },
                    ],
                }),
            ],
        },
        {
            // v4 -> v5: suppliers + purchase orders, and stock batches remember
            // which supplier they came from. batch_no/expiry_date becoming
            // optional needs no step: LokiJS stores whatever the record holds.
            toVersion: 5,
            steps: [
                addColumns({
                    table: 'stock_batches',
                    columns: [
                        { name: 'supplier_id', type: 'string', isOptional: true },
                    ],
                }),
                createTable({
                    name: 'suppliers',
                    columns: [
                        { name: 'business_id', type: 'string', isIndexed: true },
                        { name: 'name', type: 'string' },
                        { name: 'phone', type: 'string', isOptional: true },
                        { name: 'note', type: 'string', isOptional: true },
                        { name: 'sync_status', type: 'string' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
                createTable({
                    name: 'purchase_orders',
                    columns: [
                        { name: 'business_id', type: 'string', isIndexed: true },
                        { name: 'supplier_id', type: 'string', isOptional: true, isIndexed: true },
                        { name: 'status', type: 'string' },
                        { name: 'items_json', type: 'string' },
                        { name: 'note', type: 'string', isOptional: true },
                        { name: 'ordered_at', type: 'number' },
                        { name: 'sync_status', type: 'string' },
                        { name: 'updated_at', type: 'number' },
                    ],
                }),
            ],
        },
        {
            // v5 -> v6: soft deletes. Archived products/customers/suppliers drop
            // out of pickers and lists; a voided sale stays in Records, with its
            // stock and khata reversed by compensating rows.
            toVersion: 6,
            steps: [
                addColumns({ table: 'products', columns: [{ name: 'archived_at', type: 'number', isOptional: true }] }),
                addColumns({ table: 'customers', columns: [{ name: 'archived_at', type: 'number', isOptional: true }] }),
                addColumns({ table: 'suppliers', columns: [{ name: 'archived_at', type: 'number', isOptional: true }] }),
                addColumns({ table: 'sale_orders', columns: [{ name: 'voided_at', type: 'number', isOptional: true }] }),
            ],
        },
        {
            // v6 -> v7: clearance discounts. regular_price holds the normal
            // price while selling_price is the discounted one; null = no sale.
            toVersion: 7,
            steps: [
                addColumns({
                    table: 'products',
                    columns: [
                        { name: 'regular_price', type: 'number', isOptional: true },
                        { name: 'sale_until', type: 'number', isOptional: true },
                    ],
                }),
            ],
        },
    ],
});
