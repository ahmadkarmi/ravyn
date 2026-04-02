// Ravyn — Quick Action Sheet
// Context menu triggered by long-press on task cards

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';

interface QuickAction {
    label: string;
    icon: string;
    color?: string;
    onPress: () => void;
    destructive?: boolean;
}

interface QuickActionSheetProps {
    visible: boolean;
    task: Task | null;
    actions: QuickAction[];
    onClose: () => void;
}

export default function QuickActionSheet({ visible, task, actions, onClose }: QuickActionSheetProps) {
    const { colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            scaleAnim.setValue(0.9);
            opacityAnim.setValue(0);
            const anim = Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 350, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        } else {
            const anim = Animated.parallel([
                Animated.timing(scaleAnim, { toValue: 0.9, duration: 120, useNativeDriver: true }),
                Animated.timing(opacityAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        }
    }, [visible]);

    if (!visible || !task) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Pressable style={styles.backdrop} onPress={onClose}>
                <Animated.View style={[styles.overlay, { opacity: opacityAnim, backgroundColor: colors.overlay }]} />
            </Pressable>
            <View style={styles.centerContainer}>
                <Animated.View
                    style={[
                        styles.menu,
                        {
                            backgroundColor: colors.surfaceElevated,
                            transform: [{ scale: scaleAnim }],
                            opacity: opacityAnim,
                        },
                        shadows.lg,
                    ]}
                >
                    <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
                        {task.title}
                    </Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    {actions.map((action, i) => (
                        <TouchableOpacity
                            key={i}
                            style={styles.actionRow}
                            onPress={() => {
                                onClose();
                                setTimeout(action.onPress, 150);
                            }}
                            activeOpacity={0.6}
                        >
                            <Ionicons
                                name={action.icon as any}
                                size={18}
                                color={action.destructive ? colors.danger : (action.color ?? colors.textPrimary)}
                            />
                            <Text style={[
                                styles.actionLabel,
                                { color: action.destructive ? colors.danger : colors.textPrimary },
                            ]}>
                                {action.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'box-none',
    },
    menu: {
        width: 260,
        borderRadius: borderRadius.xl,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    divider: {
        height: 1,
        marginVertical: spacing.xs,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    actionLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
});
