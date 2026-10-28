// Turning the server's daily sales rows into chart-ready series.
// Sales are bucketed by the shop's calendar day (IST), so day keys are
// compared as YYYY-MM-DD strings rather than timestamps.

const DAY_MS = 86400000;
const keyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });

export function dayKey(ms) {
    return keyFmt.format(new Date(ms));
}

function emptyDay(key) {
    return { period: `${key}T00:00:00`, key, orderCount: 0, revenue: 0, cash: 0, upi: 0, credit: 0 };
}

// The last `days` days ending today (offsetDays back), with zero-filled gaps
// so quiet days still show on the chart.
export function dailyWindow(rows, days, offsetDays = 0) {
    const byKey = new Map(rows.map(r => [String(r.period).slice(0, 10), r]));
    const out = [];
    for (let i = days - 1 + offsetDays; i >= offsetDays; i--) {
        const key = dayKey(Date.now() - i * DAY_MS);
        const row = byKey.get(key);
        out.push(row ? { ...row, key, period: `${key}T00:00:00` } : emptyDay(key));
    }
    return out;
}

// Whether the 90 days of history cover the previous period too.
export function hasPreviousWindow(days) {
    return days * 2 <= 90;
}

export function sumSeries(series) {
    return series.reduce((acc, d) => ({
        revenue: acc.revenue + d.revenue,
        orderCount: acc.orderCount + d.orderCount,
        cash: acc.cash + d.cash,
        upi: acc.upi + d.upi,
        credit: acc.credit + d.credit,
    }), { revenue: 0, orderCount: 0, cash: 0, upi: 0, credit: 0 });
}

// Roll daily points up into weeks (starting Monday) or calendar months.
export function groupSeries(daily, granularity) {
    if (granularity === 'daily') return daily;
    const groups = new Map();
    for (const d of daily) {
        const date = new Date(`${d.key}T00:00:00`);
        let key;
        let label;
        if (granularity === 'weekly') {
            const monday = new Date(date);
            monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
            key = monday.toISOString().slice(0, 10);
            label = `Wk ${monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
        } else {
            key = d.key.slice(0, 7);
            label = date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }
        const g = groups.get(key) || { ...emptyDay(key), period: key, label };
        g.revenue += d.revenue;
        g.orderCount += d.orderCount;
        g.cash += d.cash;
        g.upi += d.upi;
        g.credit += d.credit;
        groups.set(key, g);
    }
    return [...groups.values()];
}
