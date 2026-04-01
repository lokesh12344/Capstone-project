import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export default class StockBatch extends Model {
    static table = 'stock_batches';

    static associations = {
        products: { type: 'belongs_to', key: 'product_id' },
        stock_transactions: { type: 'has_many', foreignKey: 'batch_id' },
        sale_items: { type: 'has_many', foreignKey: 'batch_id' },
    };

    @field('product_id') productId;
    @field('quantity') quantity;
    @field('batch_no') batchNo;
    @field('expiry_date') expiryDate;   // unix timestamp
    @field('cost_price') costPrice;
    @field('sync_status') syncStatus;
    @date('created_at') createdAt;

    @relation('products', 'product_id') product;

    // Helper: days until expiry from today
    get daysUntilExpiry() {
        const now = Date.now();
        return Math.floor((this.expiryDate - now) / (1000 * 60 * 60 * 24));
    }

    get isNearExpiry() {
        return this.daysUntilExpiry <= 30;
    }

    get isExpired() {
        return this.daysUntilExpiry < 0;
    }
}