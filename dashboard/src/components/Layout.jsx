import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { formatTime } from '../lib/format';

const NAV = [
    { to: '/dashboard', label: 'Overview', icon: 'home', end: true },
    { to: '/dashboard/inventory', label: 'Inventory', icon: 'box' },
    { to: '/dashboard/customers', label: 'Customers', icon: 'users' },
];

export const RANGE_OPTIONS = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 90 days' },
];

export default function Layout({ business, role, range, onRangeChange, lastUpdatedAt, refreshing, onRefresh, theme, onToggleTheme, onLogout, children }) {
    const { pathname } = useLocation();
    useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar__brand">
                    <strong>SmartOps</strong>
                    <span>ANALYTICS</span>
                </div>
                <nav className="sidebar__nav" aria-label="Dashboard sections">
                    {NAV.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                            <Icon name={item.icon} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
                <p className="sidebar__foot">Prices and discounts you change here reach the shop app on its next sync.</p>
            </aside>

            <div className="main">
                <header className="topbar">
                    <div className="topbar__shop" title={business.name}>
                        <Icon name="store" />
                        <span>{business.name}</span>
                    </div>
                    <div className="topbar__spacer" />

                    <div className="select-wrap">
                        <Icon name="calendar" size={18} />
                        <select className="control" value={range} onChange={e => onRangeChange(Number(e.target.value))} aria-label="Date range">
                            {RANGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <Icon name="chevronDown" size={16} />
                    </div>

                    <div className="topbar__status">
                        <span className="status-dot" />
                        {lastUpdatedAt ? `Updated ${formatTime(lastUpdatedAt)}` : 'Loading…'}
                    </div>

                    <button type="button" className="control" onClick={onRefresh} disabled={refreshing}>
                        <Icon name="refresh" size={18} className={refreshing ? 'spin' : undefined} />
                        {refreshing ? 'Refreshing' : 'Refresh'}
                    </button>

                    <button
                        type="button"
                        className="control control--icon"
                        onClick={onToggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    >
                        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
                    </button>

                    <AccountMenu business={business} role={role} onLogout={onLogout} />
                </header>

                {children}
            </div>
        </div>
    );
}

function AccountMenu({ business, role, onLogout }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
        const onKey = e => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const initials = business.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

    return (
        <div className="account" ref={ref}>
            <button type="button" className="avatar" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open}>
                {initials}
            </button>
            {open && (
                <div className="menu" role="menu">
                    <div className="menu__head">
                        <strong>{business.name}</strong>
                        <span>{role || 'owner'} · {business.phone}</span>
                    </div>
                    <button type="button" role="menuitem" onClick={onLogout}>
                        <Icon name="logout" size={18} /> Log out
                    </button>
                </div>
            )}
        </div>
    );
}
