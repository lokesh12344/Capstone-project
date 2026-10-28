import { useCallback, useEffect, useState } from 'react';

const THEME_KEY = 'smartops_dashboard_theme';

// 'light' | 'dark'. First visit follows the OS setting; after that the
// viewer's own choice is remembered in this browser.
function initialTheme() {
    try {
        const saved = window.localStorage.getItem(THEME_KEY);
        if (saved === 'light' || saved === 'dark') return saved;
    } catch {
        // storage blocked — fall through to the OS preference
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
    const [theme, setTheme] = useState(initialTheme);

    useEffect(() => {
        document.documentElement.dataset.theme = theme;
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch {
            // not persisted; the toggle still works for this visit
        }
    }, [theme]);

    const toggle = useCallback(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')), []);
    return { theme, toggle };
}
