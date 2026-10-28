import React, { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import OverviewView from '../views/OverviewView';
import InventoryView from '../views/InventoryView';
import CustomersView from '../views/CustomersView';
import { useDashboardData } from '../hooks/useDashboardData';

// Shell for the three dashboard sections. Data is loaded once here and shared,
// so switching sections is instant and Refresh updates everything.
export default function DashboardPage({ auth, theme, onToggleTheme }) {
    const { token, business, role } = auth.session;
    const [range, setRange] = useState(30);
    const data = useDashboardData(token, auth.logout);
    const isOwner = role !== 'staff';

    return (
        <Layout
            business={business}
            role={role}
            range={range}
            onRangeChange={setRange}
            lastUpdatedAt={data.lastUpdatedAt}
            refreshing={data.refreshing}
            onRefresh={data.refresh}
            theme={theme}
            onToggleTheme={onToggleTheme}
            onLogout={auth.logout}
        >
            <Routes>
                <Route index element={<OverviewView business={business} feeds={data.feeds} range={range} onRetry={data.refresh} />} />
                <Route path="inventory" element={(
                    <InventoryView
                        feeds={data.feeds}
                        isOwner={isOwner}
                        onRetry={data.loadInventory}
                        onApplyDiscount={data.applyDiscount}
                        onEndDiscount={data.endDiscount}
                    />
                )} />
                <Route path="customers" element={<CustomersView feeds={data.feeds} onRetry={data.refresh} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Layout>
    );
}
