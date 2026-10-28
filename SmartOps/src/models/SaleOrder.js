import { Model } from '@nozbe/watermelondb';
import { field, children, relation } from '@nozbe/watermelondb/decorators';

export default class SaleOrder extends Model {
    static table = 'sale_orders';

    static associations = {
        sale_items: { type: 'has_many', foreignKey: 'order_id' },
        customers: { type: 'belongs_to', key: 'customer_id' },
    };

    @field('business_id') businessId;
    @field('customer_id') customerId;
    @field('total_amount') totalAmount;
    @field('payment_mode') paymentMode;
    @field('sale_at') saleAt;
    @field('voided_at') voidedAt;
    @field('sync_status') syncStatus;
    @field('updated_at') updatedAt;

    @children('sale_items') saleItems;
    @relation('customers', 'customer_id') customer;
}