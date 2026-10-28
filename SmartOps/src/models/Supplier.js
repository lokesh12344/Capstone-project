import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Supplier extends Model {
    static table = 'suppliers';

    @field('business_id') businessId;
    @field('name') name;
    @field('phone') phone;
    @field('note') note;
    @field('archived_at') archivedAt;
    @field('sync_status') syncStatus;
    @field('updated_at') updatedAt;
}
