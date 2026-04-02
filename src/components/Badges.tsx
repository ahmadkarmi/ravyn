// Ravyn — Header Badges (Redesigned)
// Animated, theme-aware

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, animations } from '../theme';

// ─── Animated Counter ─────────────────────────────────

function AnimatedValue({ value, color }: { value: string; color: string }) {
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scale, {
                toValue: 1.3,
                duration: 120,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                damping: 10,
                stiffness: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [value]);

    return (
        <Animated.Text
            style={[
                styles.badgeValue,
                { color, transform: [{ scale }] },
            ]}
        >
            {value}
        </Animated.Text>
    );
}

// ─── Streak Badge ─────────────────────────────────────

interface StreakBadgeProps {
    streak: number | null;
}

export function StreakBadge({ streak }: StreakBadgeProps) {
    const { colors } = useTheme();
    const display = streak === null ? '—' : `${streak}`;
    const isActive = streak !== null && streak > 0;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isActive]);

    return (
        <View style={[styles.badge, { backgroundColor: colors.overlayLight, borderRadius: borderRadius.md }]}>
            <Animated.Text
                style={[
                    styles.badgeIcon,
                    isActive && { transform: [{ scale: pulseAnim }] },
                ]}
            >
                🔥
            </Animated.Text>
            <AnimatedValue
                value={display}
                color={isActive ? colors.streak : colors.textSecondary}
            />
            <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>Streak</Text>
        </View>
    );
}

// ─── Integrity Badge ──────────────────────────────────

interface IntegrityBadgeProps {
    points: number;
    onPress?: () => void;
}

export function IntegrityBadge({ points, onPress }: IntegrityBadgeProps) {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[styles.badge, { backgroundColor: colors.overlayLight, borderRadius: borderRadius.md }]}
            onPress={onPress}
            disabled={!onPress}
            activeOpacity={0.6}
        >
            <Text style={styles.badgeIcon}>💎</Text>
            <AnimatedValue value={`${points}`} color={colors.integrity} />
            <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>Integrity</Text>
        </TouchableOpacity>
    );
}

// ─── Boost Badge ──────────────────────────────────────

interface BoostBadgeProps {
    tokens: number;
}

export function BoostBadge({ tokens }: BoostBadgeProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.badge, { backgroundColor: colors.overlayLight, borderRadius: borderRadius.md }]}>
            <Text style={styles.badgeIcon}>⚡</Text>
            <AnimatedValue value={`${tokens}`} color={colors.boost} />
            <Text style={[styles.badgeLabel, { color: colors.textMuted }]}>Boosts</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
    badge: {
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        flex: 1,
    },
    badgeIcon: {
        fontSize: 20,
        marginBottom: 4,
    },
    badgeValue: {
        fontSize: 22,
        fontWeight: '800',
        fontFamily: 'Georgia',
    },
    badgeLabel: {
        ...typography.label,
        marginTop: 3,
    },
});
