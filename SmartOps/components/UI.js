import React from 'react';
import {
    View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { colors, spacing, radius, font } from '../src/theme';

// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ label, color = colors.teal, bg }) {
    return (
        <View style={[s.badge, { backgroundColor: bg || color + '22', borderColor: color + '55' }]}>
            <Text style={[s.badgeText, { color }]}>{label}</Text>
        </View>
    );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
    return <View style={[s.card, style]}>{children}</View>;
}

// ── PrimaryButton ────────────────────────────────────────────────────────────
export function PrimaryButton({ label, onPress, loading, disabled, color, style }) {
    const bg = color || colors.teal;
    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
            style={[s.primaryBtn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }, style]}
        >
            {loading
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={s.primaryBtnText}>{label}</Text>}
        </TouchableOpacity>
    );
}

// ── GhostButton ──────────────────────────────────────────────────────────────
export function GhostButton({ label, onPress, color, style }) {
    const c = color || colors.teal;
    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}
            style={[s.ghostBtn, { borderColor: c + '55' }, style]}>
            <Text style={[s.ghostBtnText, { color: c }]}>{label}</Text>
        </TouchableOpacity>
    );
}

// ── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
    return (
        <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>{title}</Text>
            {action && (
                <TouchableOpacity onPress={onAction}>
                    <Text style={s.sectionAction}>{action}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

// ── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, subtitle }) {
    return (
        <View style={s.empty}>
            <Text style={s.emptyIcon}>{icon}</Text>
            <Text style={s.emptyTitle}>{title}</Text>
            {subtitle && <Text style={s.emptySubtitle}>{subtitle}</Text>}
        </View>
    );
}

// ── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ style }) {
    return <View style={[s.divider, style]} />;
}

const s = StyleSheet.create({
    badge: {
        paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: radius.full, borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeText: { fontSize: font.xs, fontWeight: '600', letterSpacing: 0.3 },

    card: {
        backgroundColor: colors.bgCard,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
    },

    primaryBtn: {
        borderRadius: radius.md,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryBtnText: {
        color: colors.bg,
        fontSize: font.md,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    ghostBtn: {
        borderRadius: radius.md,
        paddingVertical: 13,
        alignItems: 'center',
        borderWidth: 1,
    },
    ghostBtnText: { fontSize: font.md, fontWeight: '600' },

    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: spacing.md,
    },
    sectionTitle: {
        color: colors.textSecondary,
        fontSize: font.sm,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    sectionAction: { color: colors.teal, fontSize: font.sm, fontWeight: '600' },

    empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
    emptyIcon: { fontSize: 40, marginBottom: spacing.md },
    emptyTitle: {
        color: colors.textSecondary, fontSize: font.lg,
        fontWeight: '600', marginBottom: spacing.sm, textAlign: 'center',
    },
    emptySubtitle: {
        color: colors.textMuted, fontSize: font.sm,
        textAlign: 'center', lineHeight: 20,
    },

    divider: {
        height: 1, backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
});