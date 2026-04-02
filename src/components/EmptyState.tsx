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

    useEffect(() => {
        const anim = Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 140, useNativeDriver: true }),
        ]);
        anim.start();
        return () => { anim.stop(); };
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
            <View style={[styles.iconRing, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name={icon} size={28} color={colors.primary} style={{ opacity: 0.6 }} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
            {action && <View style={styles.actionContainer}>{action}</View>}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: spacing.xxl,
    },
    iconRing: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
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
