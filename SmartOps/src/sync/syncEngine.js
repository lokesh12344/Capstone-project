import { synchronize, hasUnsyncedChanges } from '@nozbe/watermelondb/sync';
import NetInfo from '@react-native-community/netinfo';
import database from '../database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearSession } from '../services/session';

export const API_BASE = 'https://smartops-app.duckdns.org/api';

// Sent on every pull so the server only includes tables this build knows about
// (older installed APKs omit it and keep getting the original 7 tables).
// Keep in step with the version in src/database/schema.js.
const SCHEMA_VERSION = 6;

// ─────────────────────────────────────────────────────────────────────────────
// Auth state — in-memory, set on login, cleared on logout
// ─────────────────────────────────────────────────────────────────────────────
let _token = null;
let _businessId = null;

export async function setAuthToken(token) {
    _token = token;
    // AsyncStorage.setItem throws on null/undefined — clear the key instead.
    if (token == null) await AsyncStorage.removeItem('authToken');
    else await AsyncStorage.setItem('authToken', token);
}

export async function setBusinessId(id) {
    _businessId = id;
    // AsyncStorage.setItem throws on null/undefined — clear the key instead.
    if (id == null) await AsyncStorage.removeItem('businessId');
    else await AsyncStorage.setItem('businessId', id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync status — what the UI shows (Profile's "last synced", Home's pill)
// ─────────────────────────────────────────────────────────────────────────────
let _status = { syncing: false, lastSyncedAt: null, lastError: null, hasPending: false };
const _statusListeners = new Set();

function setStatus(patch) {
    _status = { ..._status, ...patch };
    _statusListeners.forEach(fn => fn(_status));
}

export function getSyncStatus() { return _status; }

export function subscribeSyncStatus(fn) {
    _statusListeners.add(fn);
    return () => _statusListeners.delete(fn);
}

// Re-reads whether any local row is still waiting to be pushed.
export async function refreshPendingStatus() {
    try {
        setStatus({ hasPending: await hasUnsyncedChanges({ database }) });
    } catch {
        // DB not ready yet — the next sync will set it
    }
    return _status.hasPending;
}

export function getAuthToken() { return _token; }
export function getBusinessId() { return _businessId; }

export async function restoreSession() {
    _token = await AsyncStorage.getItem('authToken');
    _businessId = await AsyncStorage.getItem('businessId');
    const last = Number(await AsyncStorage.getItem('lastSyncedAt'));
    if (last) setStatus({ lastSyncedAt: last });

    console.log('[session] restored:', {
        token: !!_token,
        businessId: _businessId,
    });
}

function authHeaders() {
    const h = { 'Content-Type': 'application/json' };
    if (_token) h['Authorization'] = `Bearer ${_token}`;
    return h;
}

function toFiniteNumber(value, fallback = 0) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
}

function toTimestampMs(value, fallback = 0) {
    const parsed = toFiniteNumber(value, fallback);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed < 1000000000000 ? parsed * 1000 : parsed;
}

function normalizeTableChanges(tableChanges, { numberFields = [], timestampFields = [], nullableFields = [] } = {}) {
    if (!tableChanges) return { created: [], updated: [], deleted: [] };

    const normalizeRow = row => {
        const normalized = { ...row };

        numberFields.forEach(field => {
            if (Object.prototype.hasOwnProperty.call(normalized, field)) {
                normalized[field] = toFiniteNumber(normalized[field]);
            }
        });

        timestampFields.forEach(field => {
            if (nullableFields.includes(field) && normalized[field] == null) return;
            if (Object.prototype.hasOwnProperty.call(normalized, field)) {
                normalized[field] = toTimestampMs(normalized[field]);
            }
        });

        return normalized;
    };

    return {
        created: (tableChanges.created || []).map(normalizeRow),
        updated: (tableChanges.updated || []).map(normalizeRow),
        deleted: tableChanges.deleted || [],
    };
}

function normalizePullChanges(changes) {
    return {
        ...changes,
        products: normalizeTableChanges(changes.products, {
            numberFields: ['reorder_level', 'selling_price'],
            timestampFields: ['archived_at', 'updated_at'],
            nullableFields: ['archived_at'],
        }),
        stock_batches: normalizeTableChanges(changes.stock_batches, {
            numberFields: ['quantity', 'cost_price'],
            timestampFields: ['expiry_date', 'created_at', 'updated_at'],
            nullableFields: ['expiry_date'],   // loose goods have no expiry
        }),
        stock_transactions: normalizeTableChanges(changes.stock_transactions, {
            numberFields: ['quantity'],
            timestampFields: ['txn_at', 'updated_at'],
        }),
        sale_orders: normalizeTableChanges(changes.sale_orders, {
            numberFields: ['total_amount'],
            timestampFields: ['sale_at', 'voided_at', 'updated_at'],
            nullableFields: ['voided_at'],
        }),
        sale_items: normalizeTableChanges(changes.sale_items, {
            numberFields: ['quantity', 'unit_price'],
            timestampFields: ['updated_at'],
        }),
        customers: normalizeTableChanges(changes.customers, {
            timestampFields: ['last_purchase_at', 'archived_at', 'updated_at'],
            nullableFields: ['archived_at'],
        }),
        ledger_entries: normalizeTableChanges(changes.ledger_entries, {
            numberFields: ['amount'],
            timestampFields: ['entry_at', 'updated_at'],
        }),
        suppliers: normalizeTableChanges(changes.suppliers, {
            timestampFields: ['archived_at', 'updated_at'],
            nullableFields: ['archived_at'],
        }),
        purchase_orders: normalizeTableChanges(changes.purchase_orders, {
            timestampFields: ['ordered_at', 'updated_at'],
        }),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Core sync
// ─────────────────────────────────────────────────────────────────────────────
let _syncing = false;

// Resolves to { ok, error } so callers can tell the shopkeeper what happened;
// background callers just ignore it.
export async function syncWithServer() {
    if (!_token || !_businessId) {
        console.log('[sync] 🔄 Skipped (Missing token or businessId)');
        return { ok: false, error: 'Not signed in' };
    }
    if (_syncing) {
        console.log('[sync] ⏳ Skipped (Already in progress)');
        return { ok: false, error: 'A sync is already running', busy: true };
    }
    _syncing = true;
    setStatus({ syncing: true });
    console.log('[sync] 🚀 Started sync...');

    try {
        await synchronize({
            database,

            pullChanges: async ({ lastPulledAt }) => {
                const res = await fetch(
                    `${API_BASE}/sync/pull?last_pulled_at=${lastPulledAt ?? 0}&schema_version=${SCHEMA_VERSION}`,
                    { headers: authHeaders() }
                );
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Pull failed ${res.status}`);
                }
                const { changes, timestamp } = await res.json();
                const normalizedChanges = normalizePullChanges(changes);

                return { changes: normalizedChanges, timestamp };
            },

            pushChanges: async ({ changes, lastPulledAt }) => {
                const res = await fetch(`${API_BASE}/sync/push`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ changes, lastPulledAt }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Push failed ${res.status}`);
                }
            },
            sendCreatedAsUpdated: false,
        });

        console.log('✅ [sync] Complete at', new Date().toISOString());
        const at = Date.now();
        setStatus({ lastSyncedAt: at, lastError: null });
        AsyncStorage.setItem('lastSyncedAt', String(at)).catch(() => {});
        return { ok: true };
    } catch (err) {
        console.warn('❌ [sync] Failed (will retry on next trigger):', err.message);
        setStatus({ lastError: err.message });
        return { ok: false, error: err.message };
    } finally {
        _syncing = false;
        setStatus({ syncing: false });
        refreshPendingStatus();
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-write sync — call this after any create/update action
// Debounced so rapid consecutive writes (e.g. multi-item order) only fire once
// ─────────────────────────────────────────────────────────────────────────────
let _syncTimer = null;

export function syncAfterWrite(delayMs = 1500) {
    setStatus({ hasPending: true });
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => {
        _syncTimer = null;
        syncWithServer();
    }, delayMs);
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-sync on reconnect
// ─────────────────────────────────────────────────────────────────────────────
let _unsubscribe = null;

export function startAutoSync() {
    if (!_token || !_businessId) {
        console.log('[sync] 🔄 Skipped startAutoSync (Missing token or businessId)');
        return;
    }
    if (_unsubscribe) _unsubscribe();

    // Sync immediately on login
    syncWithServer();

    // Re-sync every time network comes back
    _unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected && state.isInternetReachable) {
            syncWithServer();
        }
    });

    return _unsubscribe;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logout — ALWAYS do a final sync push before clearing credentials
// This ensures any writes made just before logout reach the server
// ─────────────────────────────────────────────────────────────────────────────
export async function logoutAndSync() {
    if (_syncTimer) {
        clearTimeout(_syncTimer);
        _syncTimer = null;
    }

    // Final push — wait for it to complete before wiping token
    console.log('[sync] Final sync before logout...');
    await syncWithServer();

    // Now safe to clear credentials (await so keys are gone before we return)
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    await setAuthToken(null);
    await setBusinessId(null);
    await clearSession();
    await AsyncStorage.removeItem('lastSyncedAt');
    setStatus({ lastSyncedAt: null, lastError: null, hasPending: false });

    console.log('[sync] Logged out cleanly.');
}

// Keep stopAutoSync for backwards compat but it now does a final sync too
export async function stopAutoSync() {
    await logoutAndSync();
}
