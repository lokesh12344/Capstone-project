import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, Modal, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { PrimaryButton, GhostButton } from './UI';
import { colors, spacing, radius, font } from '../src/theme';

// Alert.prompt is iOS-only, so WhatsApp sends that hit a missing number use
// this instead. <PhonePromptHost /> is mounted once in App.js; services call
// askPhone() and await the typed number (null if cancelled).
let showPrompt = null;

export function askPhone({ title, message }) {
    if (!showPrompt) return Promise.resolve(null);
    return new Promise(resolve => showPrompt({ title, message, resolve }));
}

export function PhonePromptHost() {
    const [request, setRequest] = useState(null);  // { title, message, resolve }
    const [phone, setPhone] = useState('');

    useEffect(() => {
        showPrompt = req => { setPhone(''); setRequest(req); };
        return () => { showPrompt = null; };
    }, []);

    function finish(value) {
        request?.resolve(value);
        setRequest(null);
    }

    const valid = phone.replace(/\D/g, '').length === 10;

    return (
        <Modal visible={!!request} transparent animationType="fade" onRequestClose={() => finish(null)}>
            <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={s.box}>
                    <Text style={s.title}>{request?.title}</Text>
                    {!!request?.message && <Text style={s.message}>{request.message}</Text>}
                    <TextInput
                        style={s.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="10-digit phone number"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        autoFocus
                    />
                    <PrimaryButton label="Save & send" onPress={() => finish(phone.trim())} disabled={!valid} style={{ marginTop: spacing.lg }} />
                    <GhostButton label="Cancel" onPress={() => finish(null)} style={{ marginTop: spacing.sm }} />
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1, justifyContent: 'center', padding: spacing.xl,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    box: {
        backgroundColor: colors.bgCard, borderRadius: radius.xl,
        borderWidth: 1, borderColor: colors.borderLight, padding: spacing.xl,
    },
    title: { color: colors.textPrimary, fontSize: font.lg, fontWeight: '700' },
    message: { color: colors.textSecondary, fontSize: font.sm, marginTop: spacing.xs },
    input: {
        backgroundColor: colors.bgInput, borderRadius: radius.md,
        borderWidth: 1, borderColor: colors.border, color: colors.textPrimary,
        fontSize: font.md, padding: spacing.md, marginTop: spacing.lg,
    },
});
