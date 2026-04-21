import React from 'react';

export default function Shell({ title, subtitle, actions, children }) {
    return (
        <div className="shell">
            <header className="shell__header">
                <div>
                    <p className="eyebrow">SmartOps Analytics</p>
                    <h1>{title}</h1>
                    {subtitle ? <p className="shell__subtitle">{subtitle}</p> : null}
                </div>
                <div className="shell__actions">{actions}</div>
            </header>
            {children}
        </div>
    );
}
