import React from 'react';

export default function SegmentedControl({ options, value, onChange }) {
    return (
        <div className="segmented-control">
            {options.map(option => (
                <button
                    key={option.value}
                    className={`segmented-control__item ${value === option.value ? 'is-active' : ''}`.trim()}
                    onClick={() => onChange(option.value)}
                    type="button"
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
