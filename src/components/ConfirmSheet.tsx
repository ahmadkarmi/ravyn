// Ravyn — Confirm Sheet
// A bottom-sheet style confirmation dialog to replace native Alert.alert.

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Modal,
    TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows, typography } from '../theme';
import { layout } from './ds';

interface ConfirmSheetProps {
    visible: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmSheet({
    visible,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    onConfirm,
    onCancel,
}: ConfirmSheetProps) {
    const { colors } = useTheme();
    const slideAnim = useRef(new Animated.Value(200)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 300, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: 200, duration: 180, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    if (!visible) return null;

    const confirmColor = destructive ? colors.danger : colors.primary;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
            <Pressable style={styles.backdrop} onPress={onCancel}>
                <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: overlayAnim }]} />
            </Pressable>
            <Animated.View
                style={[
                    styles.sheet,
                    { backgroundColor: colors.surfaceElevated, transform: [{ translateY: slideAnim }] },
                    shadows.lg,
                ]}
            >
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.cancelBtn, { backgroundColor: colors.overlayLight }]}
                        onPress={onCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelLabel, { color: colors.textSecondary }]}>{cancelLabel}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.confirmBtn, { backgroundColor: confirmColor }]}
                        onPress={onConfirm}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.confirmLabel, { color: '#fff' }]}>{confirmLabel}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: layout.sheetRadius,
        borderTopRightRadius: layout.sheetRadius,
        padding: layout.cardPadding,
        paddingBottom: spacing.xxxl,
        alignItems: 'center',
    },
    handle: {
        width: layout.sheetHandleWidth,
        height: layout.sheetHandleHeight,
        borderRadius: 2,
        marginBottom: spacing.xl,
    },
    title: {
        ...typography.headlineSmall,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    message: {
        ...typography.bodyMedium,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    actions: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    cancelLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    confirmBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    confirmLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
});
