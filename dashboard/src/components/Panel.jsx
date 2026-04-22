import React from 'react';

export default function Panel({ id, title, subtitle, action, children, className = '' }) {
    return (
        <section id={id} className={`panel ${className}`.trim()}>
            <div className="panel__header">
                <div>
                    <h2>{title}</h2>
                    {subtitle ? <p>{subtitle}</p> : null}
                </div>
                {action ? <div>{action}</div> : null}
            </div>
            {children}
        </section>
    );
}
