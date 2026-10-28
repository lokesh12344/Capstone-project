import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../lib/format';

// Confirm (and optionally adjust) a clearance price before it goes live.
// `item`: { product_id, name, normal_price, suggested_price, cost_per_unit? }
export default function DiscountDialog({ item, onConfirm, onClose }) {
    const [price, setPrice] = useState(String(Math.round(item.suggested_price)));
    const [days, setDays] = useState('7');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);

    const value = Number(price);
    const valid = Number.isFinite(value) && value > 0 && value < item.normal_price;
    const pctOff = valid ? Math.round(((item.normal_price - value) / item.normal_price) * 100) : null;
    const margin = valid && item.cost_per_unit > 0 ? Math.round(((value - item.cost_per_unit) / value) * 100) : null;

    async function submit(e) {
        e.preventDefault();
        if (!valid) return setError(`Enter a price below ${formatCurrency(item.normal_price)}.`);
        setSaving(true);
        setError('');
        try {
            await onConfirm({ sale_price: value, days: days === 'none' ? null : Number(days) });
        } catch (err) {
            setError(err.message || 'Could not apply the discount.');
            setSaving(false);
        }
    }

    return (
        <div className="dialog-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <form className="dialog" role="dialog" aria-modal="true" aria-labelledby="discount-title" onSubmit={submit}>
                <h3 id="discount-title">Put {item.name} on sale</h3>
                <p>The new price is used for every sale in the shop app after its next sync.</p>

                <label htmlFor="sale-price">Sale price (₹)</label>
                <input id="sale-price" type="number" min="1" step="any" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} autoFocus />
                <div className="dialog__price">
                    <span className="strike">{formatCurrency(item.normal_price)}</span>
                    {pctOff != null && <span className="pill pill--sq tone-warning">{pctOff}% off</span>}
                    {margin != null && <span className={`pill pill--sq ${margin > 0 ? 'tone-primary' : 'tone-critical'}`}>{margin}% margin</span>}
                </div>

                <label htmlFor="sale-days">Ends</label>
                <select id="sale-days" value={days} onChange={e => setDays(e.target.value)}>
                    <option value="7">After 7 days</option>
                    <option value="14">After 14 days</option>
                    <option value="30">After 30 days</option>
                    <option value="none">When I end it</option>
                </select>

                {error && <p className="dialog__error">{error}</p>}

                <div className="dialog__actions">
                    <button type="button" className="btn btn--ghost btn--lg" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn--primary btn--lg" disabled={saving || !valid}>
                        {saving ? 'Applying…' : 'Apply discount'}
                    </button>
                </div>
            </form>
        </div>
    );
}
