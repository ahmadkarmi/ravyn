import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme';

interface EmptyStateProps {
    icon: any;
    title: string;
    message: string;
    action?: React.ReactNode;
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
    const { colors } = useTheme();
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.92)).current;
    // Outer pulse ring: expands outward and fades on repeat
    const pulseScale = useRef(new Animated.Value(0.85)).current;
    const pulseOpacity = useRef(new Animated.Value(0.5)).current;

    useEffect(() => {
        const entryAnim = Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 140, useNativeDriver: true }),
        ]);

        const pulseLoop = Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseScale, { toValue: 1.55, duration: 1400, useNativeDriver: true }),
                    Animated.timing(pulseScale, { toValue: 0.85, duration: 0, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(pulseOpacity, { toValue: 0, duration: 1400, useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
                ]),
            ]),
        );

        entryAnim.start();
        // Stagger pulse start so it doesn't fire before entry settles
        const pulseDelay = setTimeout(() => pulseLoop.start(), 600);

        return () => {
            entryAnim.stop();
            pulseLoop.stop();
            clearTimeout(pulseDelay);
        };
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
            <View style={styles.iconWrap}>
                {/* Outer pulse ring */}
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            backgroundColor: colors.primary + '12',
                            opacity: pulseOpacity,
                            transform: [{ scale: pulseScale }],
                        },
                    ]}
                />
                {/* Icon ring */}
                <View style={[styles.iconRing, { backgroundColor: colors.primary + '14' }]}>
                    <Ionicons name={icon} size={28} color={colors.primary} style={{ opacity: 0.7 }} />
                </View>
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
            {action && <View style={styles.actionContainer}>{action}</View>}
        </Animated.View>
    );
}

const RING_SIZE = 64;
const PULSE_SIZE = RING_SIZE;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: spacing.xxl,
    },
    iconWrap: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    pulseRing: {
        position: 'absolute',
        width: PULSE_SIZE,
        height: PULSE_SIZE,
        borderRadius: PULSE_SIZE / 2,
    },
    iconRing: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...typography.headlineSmall,
        fontSize: 17,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    message: {
        ...typography.bodySmall,
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 20,
    },
    actionContainer: {
        marginTop: spacing.md,
    },
});
