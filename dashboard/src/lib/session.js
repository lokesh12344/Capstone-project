const SESSION_KEY = 'smartops_dashboard_session';

export function getStoredSession() {
    try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function setStoredSession(session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
    window.localStorage.removeItem(SESSION_KEY);
}
