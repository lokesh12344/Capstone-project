import { Model, Q } from '@nozbe/watermelondb';
import { field, date, children, lazy } from '@nozbe/watermelondb/decorators';

export default class Product extends Model {
    static table = 'products';

    static associations = {
        stock_batches: { type: 'has_many', foreignKey: 'product_id' },
        stock_transactions: { type: 'has_many', foreignKey: 'product_id' },
        sale_items: { type: 'has_many', foreignKey: 'product_id' },
    };

    @field('name') name;
    @field('category') category;
    @field('barcode') barcode;
    @field('unit') unit;
    @field('reorder_level') reorderLevel;
    @field('schedule_h') scheduleH;       // true for pharmacy Schedule H drugs
    @field('business_id') businessId;
    @field('sync_status') syncStatus;
    @date('updated_at') updatedAt;

    @children('stock_batches') stockBatches;
    @children('stock_transactions') stockTransactions;
    @children('sale_items') saleItems;

    // Computed: current stock = sum of all stock_in - sum of all sales/wastage
    // Use this instead of storing a stock field (avoids sync conflicts)
    async currentStock() {
        const txns = await this.stockTransactions.fetch();
        return txns.reduce((acc, t) => {
            if (t.type === 'stock_in' || t.type === 'return') return acc + t.quantity;
            return acc - t.quantity;
        }, 0);
    }

    // Next batch to expire (FEFO)
    @lazy nearestExpiry = this.stockBatches
        .extend(Q.sortBy('expiry_date', Q.asc), Q.take(1));
}