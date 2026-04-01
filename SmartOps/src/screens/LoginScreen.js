import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, KeyboardAvoidingView,
    Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { AuthAPI } from '../services/api';
import { startAutoSync } from '../sync/syncEngine';
import { colors, spacing, radius, font } from '../theme';

export default function LoginScreen({ onLogin }) {
    const [mode, setMode] = useState('login');   // 'login' | 'register'
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState('kirana');
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!phone.trim() || !password.trim()) {
            return Alert.alert('Fill in all fields');
        }
        setLoading(true);
        try {
            let res;
            if (mode === 'register') {
                if (!name.trim()) return Alert.alert('Enter your shop name');
                res = await AuthAPI.register(name.trim(), phone.trim(), password, type);
            } else {
                res = await AuthAPI.login(phone.trim(), password);
            }
            // Start background sync with JWT token
            startAutoSync(res.token);
            onLogin(res.token, res.business);
        } catch (err) {
            Alert.alert('Error', err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    const shopTypes = ['kirana', 'pharmacy', 'cloud_kitchen', 'stationary', 'other'];

    return (
        <KeyboardAvoidingView
            style={s.root}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.logoArea}>
                    <Text style={s.logo}>BizOps</Text>
                    <Text style={s.tagline}>Smart inventory for your shop</Text>
                </View>

                {/* Mode toggle */}
                <View style={s.modeRow}>
                    {['login', 'register'].map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[s.modeBtn, mode === m && s.modeBtnActive]}
                            onPress={() => setMode(m)}
                        >
                            <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                                {m === 'login' ? 'Sign in' : 'Register'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {mode === 'register' && (
                    <>
                        <Text style={s.label}>SHOP NAME</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Sharma Kirana Store"
                            placeholderTextColor={colors.textMuted}
                            value={name}
                            onChangeText={setName}
                        />
                        <Text style={s.label}>SHOP TYPE</Text>
                        <View style={s.chipRow}>
                            {shopTypes.map(t => (
                                <TouchableOpacity
                                    key={t}
                                    style={[s.chip, type === t && s.chipActive]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[s.chipText, type === t && s.chipTextActive]}>
                                        {t.replace('_', ' ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <Text style={s.label}>PHONE NUMBER</Text>
                <TextInput
                    style={s.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                    maxLength={10}
                />

                <Text style={s.label}>PASSWORD</Text>
                <TextInput
                    style={s.input}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity
                    style={[s.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color={colors.bg} />
                        : <Text style={s.submitBtnText}>
                            {mode === 'login' ? 'Sign in' : 'Create account'}
                        </Text>
                    }
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    scroll: { padding: spacing.lg, paddingBottom: 60 },

    logoArea: { alignItems: 'center', paddingVertical: 60 },
    logo: { color: colors.teal, fontSize: 42, fontWeight: '800', letterSpacing: -1 },
    tagline: { color: colors.textMuted, fontSize: font.md, marginTop: 8 },

    modeRow: {
        flexDirection: 'row',
        backgroundColor: colors.bgCard,
        borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border,
        padding: 4, marginBottom: spacing.xl,
    },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.sm - 2, alignItems: 'center' },
    modeBtnActive: { backgroundColor: colors.bgInput },
    modeBtnText: { color: colors.textMuted, fontSize: font.md, fontWeight: '600' },
    modeBtnTextActive: { color: colors.textPrimary, fontSize: font.md, fontWeight: '700' },

    label: {
        color: colors.textMuted, fontSize: font.xs,
        fontWeight: '700', letterSpacing: 1,
        marginBottom: spacing.xs, marginTop: spacing.lg,
    },
    input: {
        backgroundColor: colors.bgInput,
        borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
        color: colors.textPrimary, fontSize: font.md,
        paddingHorizontal: spacing.md, paddingVertical: 14,
    },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: {
        borderRadius: radius.full, borderWidth: 1,
        borderColor: colors.border, backgroundColor: colors.bgInput,
        paddingHorizontal: 14, paddingVertical: 7,
    },
    chipActive: { borderColor: colors.teal, backgroundColor: colors.teal + '20' },
    chipText: { color: colors.textMuted, fontSize: font.sm, fontWeight: '600' },
    chipTextActive: { color: colors.teal },

    submitBtn: {
        backgroundColor: colors.teal,
        borderRadius: radius.md,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: spacing.xxl,
    },
    submitBtnText: { color: colors.bg, fontSize: font.md, fontWeight: '700' },
});