import { synchronize } from '@nozbe/watermelondb/sync';
import NetInfo from '@react-native-community/netinfo';
import database from '../database';

const API_BASE = 'https://your-backend.com/api'; // replace with your server URL
let isSyncing = false;

export async function syncWithServer(authToken) {
    if (isSyncing) return;
    isSyncing = true;

    try {
        await synchronize({
            database,

            // Pull: get changes from server since last sync
            pullChanges: async ({ lastPulledAt }) => {
                const response = await fetch(
                    `${API_BASE}/sync/pull?last_pulled_at=${lastPulledAt ?? 0}`,
                    { headers: { Authorization: `Bearer ${authToken}` } }
                );
                if (!response.ok) throw new Error('Pull failed');
                const { changes, timestamp } = await response.json();
                return { changes, timestamp };
            },

            // Push: send local pending changes to server
            pushChanges: async ({ changes, lastPulledAt }) => {
                const response = await fetch(`${API_BASE}/sync/push`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({ changes, lastPulledAt }),
                });
                if (!response.ok) throw new Error('Push failed');
            },

            // On conflict: server wins for most tables
            // Stock quantities are safe because we use transactions, not raw stock fields
            migrationsEnabledAtVersion: 1,
        });

        console.log('Sync complete');
    } catch (err) {
        console.warn('Sync failed, will retry on next connection:', err.message);
    } finally {
        isSyncing = false;
    }
}

// Auto-sync whenever network comes back
export function startAutoSync(authToken) {
    return NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            syncWithServer(authToken);
        }
    });
}