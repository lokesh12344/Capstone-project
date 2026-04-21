import React, { useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import {
    clearSession,
    getStoredSession,
    setStoredSession,
} from './lib/session';

export default function App() {
    const [session, setSession] = useState(() => getStoredSession());

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
                element={session ? <Navigate to="/dashboard" replace /> : <LoginPage auth={auth} />}
            />
            <Route
                path="/dashboard"
                element={session ? <DashboardPage auth={auth} /> : <Navigate to="/login" replace />}
            />
            <Route
                path="*"
                element={<Navigate to={session ? '/dashboard' : '/login'} replace />}
            />
        </Routes>
    );
}
