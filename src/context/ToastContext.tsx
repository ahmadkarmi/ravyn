// Ravyn — Toast Notification System

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity } from 'react-native';
import Constants from 'expo-constants';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';

// ─── Types ────────────────────────────────────────────

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface ToastData {
    id: string;
    message: string;
    variant: ToastVariant;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
}

interface ToastContextType {
    showToast: (message: string, variant?: ToastVariant, icon?: string, options?: { actionLabel?: string; onAction?: () => void; duration?: number }) => void;
}

// ─── Context ──────────────────────────────────────────

const ToastContext = createContext<ToastContextType>({
    showToast: () => { },
});

export function useToast() {
    return useContext(ToastContext);
}

// ─── Constants ────────────────────────────────────────

const MAX_STACK = 3;
const NATIVE = Platform.OS !== 'web';

// ─── Toast Item ───────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: ToastData; onDismiss: (id: string) => void }) {
    const { colors } = useTheme();
    const slideY = useRef(new Animated.Value(-80)).current;
    const fadeIn = useRef(new Animated.Value(0)).current;
    const dismissed = useRef(false);

    const dismiss = useCallback(() => {
        if (dismissed.current) return;
        dismissed.current = true;
        Animated.parallel([
            Animated.timing(slideY, { toValue: -80, duration: 250, useNativeDriver: NATIVE }),
            Animated.timing(fadeIn, { toValue: 0, duration: 200, useNativeDriver: NATIVE }),
        ]).start(() => onDismiss(toast.id));
    }, [toast.id, onDismiss, slideY, fadeIn]);

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideY, { toValue: 0, damping: 18, stiffness: 200, useNativeDriver: NATIVE }),
            Animated.timing(fadeIn, { toValue: 1, duration: 200, useNativeDriver: NATIVE }),
        ]).start();
        const timer = setTimeout(dismiss, toast.duration ?? 3000);
        return () => clearTimeout(timer);
    }, []);

    const variantConfig = {
        success: { bg: colors.successMuted, border: colors.success, defaultIcon: '✓' },
        info: { bg: colors.infoMuted, border: colors.info, defaultIcon: 'ℹ' },
        warning: { bg: colors.warningMuted, border: colors.warning, defaultIcon: '!' },
        error: { bg: colors.dangerMuted, border: colors.danger, defaultIcon: '✕' },
    };
    const config = variantConfig[toast.variant];
    const icon = toast.icon ?? config.defaultIcon;

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: colors.surface,
                    borderColor: config.border,
                    transform: [{ translateY: slideY }],
                    opacity: fadeIn,
                },
                shadows.lg,
            ]}
        >
            <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
                <Text style={[styles.icon, { color: config.border }]}>{icon}</Text>
            </View>
            <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
                {toast.message}
            </Text>
            {toast.actionLabel && (
                <TouchableOpacity
                    onPress={() => { toast.onAction?.(); dismiss(); }}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.actionText, { color: config.border }]}>{toast.actionLabel}</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

// ─── Provider ─────────────────────────────────────────

const STATUS_BAR_HEIGHT = Constants.statusBarHeight ?? (Platform.OS === 'ios' ? 54 : 40);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastData[]>([]);

    const showToast = useCallback((
        message: string,
        variant: ToastVariant = 'success',
        icon?: string,
        options?: { actionLabel?: string; onAction?: () => void; duration?: number },
    ) => {
        const id = Date.now().toString();
        // Newest at top; trim to MAX_STACK
        setToasts((prev) => [{ id, message, variant, icon, ...options }, ...prev].slice(0, MAX_STACK));
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <View
                style={[styles.container, { top: STATUS_BAR_HEIGHT + spacing.sm }]}
                pointerEvents="box-none"
            >
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
                ))}
            </View>
        </ToastContext.Provider>
    );
}

// ─── Styles ───────────────────────────────────────────

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: spacing.sm,
        right: spacing.sm,
        zIndex: 9999,
        gap: spacing.xs,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        width: width - spacing.sm * 2,
        maxWidth: 500,
        minHeight: 56,
        paddingVertical: spacing.lg + 2,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        gap: spacing.md + 2,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    icon: {
        fontSize: 17,
        fontWeight: '700',
    },
    message: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
        flex: 1,
    },
    actionBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        marginLeft: spacing.xs,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
});
