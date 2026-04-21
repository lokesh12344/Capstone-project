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
