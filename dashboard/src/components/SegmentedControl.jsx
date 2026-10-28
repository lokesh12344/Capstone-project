import React from 'react';

export default function SegmentedControl({ options, value, onChange, label }) {
    return (
        <div className="segmented" role="group" aria-label={label}>
            {options.map(option => (
                <button
                    key={option.value}
                    type="button"
                    className={value === option.value ? 'is-active' : undefined}
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
