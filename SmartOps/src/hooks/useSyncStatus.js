import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getSyncStatus, subscribeSyncStatus, refreshPendingStatus } from '../sync/syncEngine';

// { online, syncing, lastSyncedAt, lastError, hasPending } for any screen that
// wants to tell the shopkeeper whether their data has reached the server.
export function useSyncStatus() {
    const [status, setStatus] = useState(getSyncStatus());
    const [online, setOnline] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeSyncStatus(setStatus);
        refreshPendingStatus();
        return unsubscribe;
    }, []);

    useEffect(() => NetInfo.addEventListener(state => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }), []);

    return { ...status, online };
}

// "just now", "5 min ago", "3 h ago", or a date.
export function formatSyncedAgo(ms) {
    if (!ms) return 'never';
    const mins = Math.floor((Date.now() - ms) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 24 * 60) return `${Math.floor(mins / 60)} h ago`;
    return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
