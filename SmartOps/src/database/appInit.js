import database from './index';
import { restoreSession, startAutoSync, getAuthToken } from '../sync/syncEngine';
import { loadSession, saveSession } from '../services/session';
import { expireEndedDiscounts } from './actions';
import { BusinessAPI } from '../services/api';

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function initApp() {
    console.log('App init start');
    // 1. Restore auth + businessId
    await restoreSession();
    await loadSession();

    // 2. Force DB to initialize (IMPORTANT)
    try {
        await database.get('products').query().fetch();
        console.log('DB ready');
    } catch (err) {
        console.log('DB warmup error:', err.message);
    }

    // Put timed sales that ended while the app was closed back to full price.
    await expireEndedDiscounts().catch(err => console.log('Sale expiry error:', err.message));

    // 3. Extra buffer (Watermelon internal setup)
    await wait(500);

    // 4. Start sync ONLY AFTER DB READY
    startAutoSync();

    // 5. Refresh the cached shop profile/role in the background (best effort —
    //    offline just keeps the cached copy).
    if (getAuthToken()) {
        BusinessAPI.profile()
            .then(res => saveSession({ business: res.business, role: res.role, staff: res.staff }))
            .catch(() => {});
    }

    console.log('App init complete');
}