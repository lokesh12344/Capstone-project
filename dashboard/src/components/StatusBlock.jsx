import React from 'react';

export function LoadingBlock({ label = 'Loading...' }) {
    return (
        <div className="status-block">
            <div className="spinner" />
            <p>{label}</p>
        </div>
    );
}

export function ErrorBlock({ message, onRetry }) {
    return (
        <div className="status-block status-block--error">
            <p>{message}</p>
            {onRetry ? <button className="button button--ghost" onClick={onRetry}>Try again</button> : null}
        </div>
    );
}

export function EmptyBlock({ title, subtitle }) {
    return (
        <div className="status-block">
            <p className="status-block__title">{title}</p>
            <p>{subtitle}</p>
        </div>
    );
}
