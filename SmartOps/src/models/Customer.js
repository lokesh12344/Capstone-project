import { Model } from '@nozbe/watermelondb';
import { field, children } from '@nozbe/watermelondb/decorators';

export default class Customer extends Model {
    static table = 'customers';

    static associations = {
        sale_orders: { type: 'has_many', foreignKey: 'customer_id' },
    };

    @field('business_id') businessId;
    @field('name') name;
    @field('phone') phone;
    @field('address') address;
    @field('segment') segment;
    @field('last_purchase_at') lastPurchaseAt;
    @field('archived_at') archivedAt;
    @field('sync_status') syncStatus;
    @field('updated_at') updatedAt;

    @children('sale_orders') orders;
}