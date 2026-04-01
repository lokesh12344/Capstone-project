import { Model } from '@nozbe/watermelondb';
import { field, date, relation } from '@nozbe/watermelondb/decorators';

export const TXN_TYPES = {
    STOCK_IN: 'stock_in',
    SALE: 'sale',
    WASTAGE: 'wastage',
    RETURN: 'return',
};

export default class StockTransaction extends Model {
    static table = 'stock_transactions';

    static associations = {
        products: { type: 'belongs_to', key: 'product_id' },
        stock_batches: { type: 'belongs_to', key: 'batch_id' },
    };

    @field('product_id') productId;
    @field('batch_id') batchId;
    @field('type') type;        // TXN_TYPES value
    @field('quantity') quantity;
    @field('txn_at') txnAt;
    @field('sync_status') syncStatus;

    @relation('products', 'product_id') product;
    @relation('stock_batches', 'batch_id') batch;
}