// Ravyn — Offline Banner
// Shows a subtle banner when the app is offline or sync has failed.
// Displays last sync time for trust.

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useSync } from '../context/SyncContext';
import { spacing, borderRadius, typography, shadows } from '../theme';

function formatSyncTime(ts: number): string {
    if (!ts) return 'Never';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'Just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return new Date(ts).toLocaleDateString();
}

export default function OfflineBanner() {
    const { colors } = useTheme();
    const { isOnline, isSyncing, lastSyncAt, triggerSync } = useSync();

    const translateY = useRef(new Animated.Value(-60)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const [mounted, setMounted] = React.useState(false);

    // Banner is visible when offline, syncing, or never synced
    const shouldShow = !isOnline || isSyncing || lastSyncAt === 0;

    useEffect(() => {
        if (shouldShow) {
            setMounted(true);
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0, useNativeDriver: true, tension: 100, friction: 12,
                }),
                Animated.timing(opacity, {
                    toValue: 1, duration: 250, useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -60, duration: 250, useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0, duration: 200, useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [shouldShow]);

    if (!mounted) return null;

    const accentColor = !isOnline ? colors.warning : isSyncing ? colors.primary : colors.success;
    const bgColor = !isOnline ? colors.warningMuted : isSyncing ? colors.primaryMuted : colors.surface;

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                    borderColor: accentColor,
                    transform: [{ translateY }],
                    opacity,
                },
                shadows.sm,
            ]}
        >
            <View style={[styles.iconBox, { backgroundColor: accentColor + '22' }]}>
                {isSyncing ? (
                    <ActivityIndicator size="small" color={accentColor} />
                ) : (
                    <Ionicons
                        name={!isOnline ? 'cloud-offline-outline' : 'cloud-done-outline'}
                        size={18}
                        color={accentColor}
                    />
                )}
            </View>
            <View style={styles.textCol}>
                <Text style={[styles.title, { color: !isOnline ? colors.warning : colors.textPrimary }]}>
                    {!isOnline ? 'You\'re offline' : isSyncing ? 'Syncing your data...' : 'All synced'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                    {!isOnline
                        ? 'Changes are saved locally'
                        : isSyncing
                            ? 'This may take a moment'
                            : `Last synced ${formatSyncTime(lastSyncAt)}`}
                </Text>
            </View>
            {!isOnline && (
                <TouchableOpacity onPress={triggerSync} style={[styles.retryBtn, { backgroundColor: colors.warning + '20' }]} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="refresh" size={16} color={colors.warning} />
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md + 2,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    iconBox: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCol: {
        flex: 1,
        gap: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
    retryBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
