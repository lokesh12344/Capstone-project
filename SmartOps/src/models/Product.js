import { Model, Q } from '@nozbe/watermelondb';
import { field, children, lazy } from '@nozbe/watermelondb/decorators';

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
    @field('brand') brand;
    @field('unit') unit;
    @field('reorder_level') reorderLevel;
    @field('schedule_h') scheduleH;
    @field('selling_price') sellingPrice;
    @field('archived_at') archivedAt;
    @field('regular_price') regularPrice;   // set only while on sale
    @field('sale_until') saleUntil;         // optional end; null = until ended by hand

    get onSale() {
        return !!this.regularPrice && this.regularPrice > this.sellingPrice;
    }
    @field('business_id') businessId;
    @field('sync_status') syncStatus;
    @field('updated_at') updatedAt;   // plain @field not @date — keeps it as number

    @children('stock_batches') stockBatches;
    @children('stock_transactions') stockTransactions;
    @children('sale_items') saleItems;

    async currentStock() {
        const txns = await this.stockTransactions.fetch();
        return txns.reduce((acc, t) => {
            if (t.type === 'stock_in' || t.type === 'return') return acc + t.quantity;
            return acc - t.quantity;
        }, 0);
    }

    @lazy nearestExpiry = this.stockBatches
        .extend(Q.where('expiry_date', Q.gt(0)), Q.sortBy('expiry_date', Q.asc), Q.take(1));
}