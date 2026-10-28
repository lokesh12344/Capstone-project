import { API_BASE, getAuthToken } from '../sync/syncEngine';

// ─────────────────────────────────────────────────────────────────────────────
// Base fetch with auth + error normalisation
// ─────────────────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
    const token = getAuthToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
    return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────
export const AuthAPI = {
    register: (name, phone, password, type = 'kirana') =>
        apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, phone, password, type }),
        }),

    login: (phone, password) =>
        apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ phone, password }),
        }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Barcode
// ─────────────────────────────────────────────────────────────────────────────
export const BarcodeAPI = {
    lookup: (code) => apiFetch(`/barcode/${code}`),
    search: (query) => apiFetch(`/barcode/search?q=${encodeURIComponent(query)}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Shop profile + staff (online-only, owner manages)
// ─────────────────────────────────────────────────────────────────────────────
export const BusinessAPI = {
    profile: () => apiFetch('/business/profile'),
    updateProfile: (fields) =>
        apiFetch('/business/profile', { method: 'PUT', body: JSON.stringify(fields) }),
    listStaff: () => apiFetch('/staff'),
    addStaff: (name, phone, password) =>
        apiFetch('/staff', { method: 'POST', body: JSON.stringify({ name, phone, password }) }),
    removeStaff: (id) => apiFetch(`/staff/${id}`, { method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Voice — the recording goes to our server, which asks Gemini; the API key
// never lives in the app.
// ─────────────────────────────────────────────────────────────────────────────
export const VoiceAPI = {
    parse: (audioBase64, mimeType) =>
        apiFetch('/voice/parse', {
            method: 'POST',
            body: JSON.stringify({ audio: audioBase64, mime_type: mimeType }),
        }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Analytics (for dashboard and web)
// ─────────────────────────────────────────────────────────────────────────────
export const AnalyticsAPI = {
    dashboard: () => apiFetch('/analytics/dashboard'),
    sales: (period) => apiFetch(`/analytics/sales?period=${period || 'daily'}`),
    topProducts: (limit) => apiFetch(`/analytics/top-products?limit=${limit || 10}`),
    customers: () => apiFetch('/analytics/customers'),
    reorder: (limit) => apiFetch(`/analytics/inventory/reorder-suggestions?limit=${limit || 20}`),
    markdowns: () => apiFetch('/analytics/inventory/markdowns?limit=20'),
    deadStock: () => apiFetch('/analytics/inventory/dead-stock?limit=20'),
    stockRisk: () => apiFetch('/analytics/inventory/stock-risk?limit=20'),
    expiryRisk: () => apiFetch('/analytics/inventory/expiry-risk?limit=20'),
};