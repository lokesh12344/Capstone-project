import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DatabaseProvider } from '@nozbe/watermelondb/react';
import { StatusBar } from 'expo-status-bar';
import { initApp } from './src/database/appInit';

import database from './src/database';
import { colors } from './src/theme';
import { AppIcon } from './src/theme/icons';
import { AppBadgesProvider, useAppBadges } from './src/hooks/useAppBadges';
import { logoutAndSync, getAuthToken } from './src/sync/syncEngine';
import { getSession } from './src/services/session';
import { PhonePromptHost } from './components/PhonePrompt';
import FabTabButton from './components/FabTabButton';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import NewOrderScreen from './src/screens/NewOrderScreen';
import StockInScreen from './src/screens/StockInScreen';
import ProductRegistrationScreen from './src/screens/ProductRegistrationScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import OrderHistoryScreen from './src/screens/OrderHistoryScreen';
import KhataScreen from './src/screens/KhataScreen';
import DaySummaryScreen from './src/screens/DaySummaryScreen';
import ReorderScreen from './src/screens/ReorderScreen';
import CustomerDirectoryScreen from './src/screens/CustomerDirectoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ShopSettingsScreen from './src/screens/ShopSettingsScreen';
import StaffScreen from './src/screens/StaffScreen';
import SuppliersScreen from './src/screens/SuppliersScreen';
import PurchaseOrderScreen from './src/screens/PurchaseOrderScreen';
import VoiceEntryScreen from './src/screens/VoiceEntryScreen';
import InsightsScreen from './src/screens/InsightsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab.Screen requires a component even for the FAB slot — it's never actually
// rendered, because tabPress is intercepted below and redirected to a normal
// stack push of NewOrder instead of a tab switch.
function NeverRendered() { return null; }

function MainTabs({ name }) {
    const { stockAlertCount, khataDueCount } = useAppBadges();

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarActiveTintColor: colors.teal,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.bgCard,
                    borderTopColor: colors.border,
                    height: 64,
                    paddingBottom: 10,
                    paddingTop: 8,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
                tabBarBadgeStyle: { backgroundColor: colors.amber, color: colors.bg, fontSize: 10, fontWeight: '700' },
            }}
        >
            <Tab.Screen
                name="Home"
                options={{
                    tabBarIcon: ({ focused, size }) => <AppIcon name="home" size={size} active={focused} />,
                }}
            >
                {props => <HomeScreen {...props} name={name} />}
            </Tab.Screen>
            <Tab.Screen
                name="Inventory"
                component={InventoryScreen}
                options={{
                    tabBarIcon: ({ focused, size }) => <AppIcon name="inventory" size={size} active={focused} />,
                    tabBarBadge: stockAlertCount > 0 ? stockAlertCount : undefined,
                }}
            />
            <Tab.Screen
                name="NewOrderTab"
                component={NeverRendered}
                options={{
                    tabBarLabel: () => null,
                    tabBarButton: (props) => <FabTabButton {...props} />,
                }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('NewOrder');
                    },
                })}
            />
            <Tab.Screen
                name="Khata"
                component={KhataScreen}
                options={{
                    tabBarIcon: ({ focused, size }) => <AppIcon name="khata" size={size} active={focused} />,
                    tabBarBadge: khataDueCount > 0 ? khataDueCount : undefined,
                }}
            />
            <Tab.Screen
                name="OrderHistory"
                component={OrderHistoryScreen}
                options={{
                    tabBarLabel: 'Records',
                    tabBarIcon: ({ focused, size }) => <AppIcon name="records" size={size} active={focused} />,
                }}
            />
        </Tab.Navigator>
    );
}

export default function App() {
    const [booting, setBooting] = useState(true);
    const [authed, setAuthed] = useState(false);
    const [name, setName] = useState('');

    // Stay signed in across launches: initApp restores the saved token and
    // shop profile, so skip the login screen when one is there.
    useEffect(() => {
        initApp().finally(() => {
            if (getAuthToken()) {
                setName(getSession().business?.name || '');
                setAuthed(true);
            }
            setBooting(false);
        });
    }, []);
    function handleLogin(token, business) {
        setAuthed(true);
        setName(business.name);
    }

    async function handleLogout() {
        // Final sync push before credentials are wiped
        await logoutAndSync();
        setAuthed(false);
    }

    if (booting) {
        return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.teal} /></View>;
    }

    if (!authed) {
        return (
            <DatabaseProvider database={database}>
                <StatusBar style="light" />
                <LoginScreen onLogin={handleLogin} />
            </DatabaseProvider>
        );
    }

    return (
        <DatabaseProvider database={database}>
            <AppBadgesProvider>
                <NavigationContainer>
                    <StatusBar style="light" />
                    <Stack.Navigator
                        screenOptions={{
                            headerShown: false,
                            contentStyle: { backgroundColor: colors.bg },
                            animation: 'slide_from_right',
                        }}
                    >
                        <Stack.Screen name="MainTabs">
                            {props => <MainTabs {...props} name={name} />}
                        </Stack.Screen>
                        <Stack.Screen name="NewOrder" component={NewOrderScreen} />
                        <Stack.Screen name="StockIn" component={StockInScreen} />
                        <Stack.Screen name="ProductRegistration" component={ProductRegistrationScreen} />
                        <Stack.Screen name="Alerts" component={AlertsScreen} />
                        <Stack.Screen name="Reorder" component={ReorderScreen} />
                        <Stack.Screen name="Customers" component={CustomerDirectoryScreen} />
                        <Stack.Screen name="DaySummary" component={DaySummaryScreen} />
                        <Stack.Screen name="ShopSettings" component={ShopSettingsScreen} />
                        <Stack.Screen name="Staff" component={StaffScreen} />
                        <Stack.Screen name="Suppliers" component={SuppliersScreen} />
                        <Stack.Screen name="PurchaseOrder" component={PurchaseOrderScreen} />
                        <Stack.Screen name="VoiceEntry" component={VoiceEntryScreen} />
                        <Stack.Screen name="Insights" component={InsightsScreen} />
                        <Stack.Screen name="Profile">
                            {props => <ProfileScreen {...props} onLogout={handleLogout} name={name} />}
                        </Stack.Screen>
                    </Stack.Navigator>
                </NavigationContainer>
                <PhonePromptHost />
            </AppBadgesProvider>
        </DatabaseProvider>
    );
}
