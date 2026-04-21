const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';

export function getApiBaseUrl() {
    return (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
}

export async function apiRequest(path, options = {}) {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    if (!response.ok) {
        const payload = await safeJson(response);
        const error = new Error(payload?.error || 'Request failed');
        error.status = response.status;
        throw error;
    }

    return safeJson(response);
}

export async function loginRequest({ phone, password }) {
    return apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone, password }),
    });
}

export async function authedRequest(path, token) {
    return apiRequest(path, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

async function safeJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}
