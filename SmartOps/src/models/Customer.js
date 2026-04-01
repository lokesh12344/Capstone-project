import { Model } from '@nozbe/watermelondb';
import { field, date, children } from '@nozbe/watermelondb/decorators';

export default class Customer extends Model {
    static table = 'customers';

    static associations = {
        sale_orders: { type: 'has_many', foreignKey: 'customer_id' },
    };

    @field('business_id') businessId;
    @field('name') name;
    @field('phone') phone;
    @field('segment') segment;        // 'regular' | 'dormant' | 'new'
    @date('last_purchase_at') lastPurchaseAt;
    @field('sync_status') syncStatus;

    @children('sale_orders') orders;
}