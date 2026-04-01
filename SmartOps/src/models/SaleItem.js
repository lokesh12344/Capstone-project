import { Model } from '@nozbe/watermelondb';
import { field, relation } from '@nozbe/watermelondb/decorators';

export default class SaleItem extends Model {
    static table = 'sale_items';

    static associations = {
        sale_orders: { type: 'belongs_to', key: 'order_id' },
        products: { type: 'belongs_to', key: 'product_id' },
        stock_batches: { type: 'belongs_to', key: 'batch_id' },
    };

    @field('order_id') orderId;
    @field('product_id') productId;
    @field('batch_id') batchId;
    @field('quantity') quantity;
    @field('unit_price') unitPrice;

    @relation('sale_orders', 'order_id') order;
    @relation('products', 'product_id') product;
    @relation('stock_batches', 'batch_id') batch;
}