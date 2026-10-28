export function formatCurrency(value) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

export function formatCompactNumber(value) {
    return new Intl.NumberFormat('en-IN', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value || 0));
}

export function formatDateTime(value) {
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function formatDate(value) {
    if (!value) return 'No orders yet';
    return new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
    }).format(new Date(Number(value)));
}

export function formatShortDate(value) {
    const date = new Date(value);
    return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
    }).format(date);
}

export function normalizeNumber(value) {
    return Number(value || 0);
}

export function formatTime(value) {
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

// "today", "yesterday", "5 days ago", or a date for anything older.
export function formatAgo(value) {
    if (!value) return 'Never';
    const days = Math.floor((Date.now() - Number(value)) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days} days ago`;
    return formatDate(value);
}

// % change from `previous` to `current`; null when there's nothing to compare.
export function percentChange(current, previous) {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
}
