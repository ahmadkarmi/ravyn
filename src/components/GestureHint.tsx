// Ravyn — Gesture Hint
// Shows a one-time animated hint on the first task card to teach swipe gestures.
// Dismissed on tap or after timeout, never shown again.

import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme';
import { getItem, setItem, StorageKeys } from '../services/storageService';

const HINT_KEY = 'swipe_gestures';

interface GestureHintProps {
    /** Only show when there are tasks to swipe */
    enabled: boolean;
}

export default function GestureHint({ enabled }: GestureHintProps) {
    const { colors } = useTheme();
    const [show, setShow] = useState(false);
    const opacity = useRef(new Animated.Value(0)).current;
    const arrowX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;

        (async () => {
            const seen = await getItem<string[]>(StorageKeys.HINTS_SEEN) ?? [];
            if (seen.includes(HINT_KEY) || cancelled) return;
            setShow(true);
        })();

        return () => { cancelled = true; };
    }, [enabled]);

    useEffect(() => {
        if (!show) return;

        // Fade in
        const fadeIn = Animated.timing(opacity, { toValue: 1, duration: 400, delay: 600, useNativeDriver: true });
        fadeIn.start();

        // Gentle left-right arrow oscillation
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(arrowX, { toValue: 6, duration: 600, useNativeDriver: true }),
                Animated.timing(arrowX, { toValue: -6, duration: 600, useNativeDriver: true }),
                Animated.timing(arrowX, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
        );
        loop.start();

        // Auto-dismiss after 8 seconds
        const timer = setTimeout(() => dismiss(), 8000);

        return () => {
            fadeIn.stop();
            loop.stop();
            clearTimeout(timer);
        };
    }, [show]);

    const dismiss = async () => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
            setShow(false);
        });
        const seen = await getItem<string[]>(StorageKeys.HINTS_SEEN) ?? [];
        if (!seen.includes(HINT_KEY)) {
            await setItem(StorageKeys.HINTS_SEEN, [...seen, HINT_KEY]);
        }
    };

    if (!show) return null;

    return (
        <Pressable onPress={dismiss}>
            <Animated.View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity }]}>
                <Animated.View style={{ transform: [{ translateX: arrowX }] }}>
                    <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                </Animated.View>
                <View style={styles.textCol}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Swipe tasks for quick actions</Text>
                    <Text style={[styles.sub, { color: colors.textMuted }]}>
                        Right to complete · Left to delete
                    </Text>
                </View>
                <Ionicons name="close" size={14} color={colors.textMuted} />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.sm + 2,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        marginBottom: spacing.sm,
    },
    textCol: {
        flex: 1,
    },
    title: {
        fontSize: 13,
        fontWeight: '600',
    },
    sub: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 1,
    },
});
