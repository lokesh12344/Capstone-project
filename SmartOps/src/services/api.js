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
// Analytics (for dashboard and web)
// ─────────────────────────────────────────────────────────────────────────────
export const AnalyticsAPI = {
    dashboard: () => apiFetch('/analytics/dashboard'),
    sales: (period) => apiFetch(`/analytics/sales?period=${period || 'daily'}`),
    topProducts: (limit) => apiFetch(`/analytics/top-products?limit=${limit || 10}`),
    customers: () => apiFetch('/analytics/customers'),
};