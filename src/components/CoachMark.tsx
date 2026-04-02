// Ravyn — CoachMark Component
// Animated tooltip overlay for first-time user guidance
// Progressive disclosure: shows one tip at a time

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoachMarkProps {
    visible: boolean;
    title: string;
    message: string;
    emoji?: string;
    position: 'top' | 'center' | 'bottom';
    onDismiss: () => void;
}

export default function CoachMark({
    visible,
    title,
    message,
    emoji,
    position = 'center',
    onDismiss,
}: CoachMarkProps) {
    const { colors, isDark } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(15)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, damping: 18, stiffness: 120, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 120, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    }, [visible]);

    if (!visible) return null;

    const tooltipPosition =
        position === 'top'
            ? { top: 160 }
            : position === 'bottom'
                ? { bottom: 160 }
                : { top: SCREEN_HEIGHT * 0.35 };

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <TouchableOpacity
                style={styles.backdrop}
                onPress={onDismiss}
                activeOpacity={1}
            />

            <Animated.View
                style={[
                    styles.tooltip,
                    tooltipPosition,
                    {
                        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                        borderColor: colors.primary,
                        transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                    },
                ]}
            >
                {emoji && <Text style={styles.emoji}>{emoji}</Text>}
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={onDismiss}
                    activeOpacity={0.9}
                >
                    <Text style={[styles.buttonText, { color: colors.primaryContrast }]}>Got it</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    tooltip: {
        position: 'absolute',
        left: spacing.xl,
        right: spacing.xl,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center',
        // Shadow
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    emoji: {
        fontSize: 40,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: spacing.lg,
        opacity: 0.8,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: spacing.xxl,
        borderRadius: borderRadius.full,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
