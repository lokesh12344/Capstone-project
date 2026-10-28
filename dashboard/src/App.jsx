import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import { useTheme } from './lib/theme';
import {
    clearSession,
    getStoredSession,
    setStoredSession,
} from './lib/session';

export default function App() {
    const [session, setSession] = useState(() => getStoredSession());
    const { theme, toggle } = useTheme();

    const auth = useMemo(() => ({
        session,
        login(nextSession) {
            setStoredSession(nextSession);
            setSession(nextSession);
        },
        logout() {
            clearSession();
            setSession(null);
        },
    }), [session]);

    return (
        <Routes>
            <Route
                path="/login"
                element={session ? <Navigate to="/dashboard" replace /> : <LoginPage auth={auth} theme={theme} onToggleTheme={toggle} />}
            />
            <Route
                path="/dashboard/*"
                element={session ? <DashboardPage auth={auth} theme={theme} onToggleTheme={toggle} /> : <Navigate to="/login" replace />}
            />
            <Route
                path="*"
                element={<Navigate to={session ? '/dashboard' : '/login'} replace />}
            />
        </Routes>
    );
}
