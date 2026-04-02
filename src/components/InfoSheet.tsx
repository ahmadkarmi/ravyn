// Ravyn — Info Sheet
// Reusable bottom sheet for contextual education about app concepts.
// Tap a stat chip → learn what it means and how it works.

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Pressable,
    ScrollView,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, shadows, animations } from '../theme';

// ─── Content types ───────────────────────────────────

export interface InfoItem {
    icon: string;
    text: string;
}

export interface InfoContent {
    title: string;
    icon: string;
    iconColor?: string;
    summary: string;
    items: InfoItem[];
    tip?: string;
}

// ─── Pre-built content ───────────────────────────────

export const INFO_CONTENT: Record<string, InfoContent> = {
    streak: {
        title: 'Streaks',
        icon: 'flame',
        summary: 'Close at least one task every day to build your streak. Miss a day and it resets back to zero.',
        items: [
            { icon: 'checkmark-circle', text: 'Close at least 1 task per day to keep your streak alive' },
            { icon: 'heart', text: 'First missed day: you get one free pass. Second missed day resets to zero.' },
            { icon: 'flash', text: 'Have a Boost token? Spend it on a missed day to avoid a reset.' },
            { icon: 'trophy', text: 'Reach 7, 30, or 90 days to earn a free Boost token' },
            { icon: 'shield-checkmark', text: 'A long streak shows you follow through, not just plan.' },
        ],
        tip: 'One task is enough. Show up every day.',
    },
    integrity: {
        title: 'Integrity Points',
        icon: 'shield-checkmark',
        summary: 'Integrity Points track how well you handle your tasks. Reach 200 to earn a Boost Token, then your score resets and you start climbing again. Your score stops growing if all 3 Boost slots are full.',
        items: [
            { icon: 'add-circle', text: '+10 for closing a task on time' },
            { icon: 'time', text: '+4 for closing a task within 12 hours of its due time' },
            { icon: 'alert-circle', text: '+2 for closing a task that is already overdue' },
            { icon: 'star', text: '+5 if no tasks are overdue at the end of your day' },
            { icon: 'sunny', text: '+3 for closing at least 1 task today' },
            { icon: 'remove-circle', text: '-1 per overdue task at end of day (max -5 total)' },
            { icon: 'trash', text: '-3 for deleting a task that is already overdue' },
            { icon: 'refresh', text: '-2 for rescheduling the same task 3 or more times today' },
        ],
        tip: 'Close tasks before they go overdue. That is where most points are won or lost.',
    },
    boost: {
        title: 'Boost Tokens',
        icon: 'flash',
        summary: 'Boost Tokens protect your streak when you miss a day. Spend one and your streak stays intact instead of resetting to zero. Each token covers exactly one missed day.',
        items: [
            { icon: 'shield-checkmark', text: 'Earned when your Integrity Points reach 200' },
            { icon: 'trophy', text: 'Also earned when your streak hits 7, 30, or 90 days' },
            { icon: 'heart', text: 'Spend one when you miss a day to keep your streak alive' },
            { icon: 'lock-closed', text: 'You can hold up to 3 tokens. Your points stop growing when all 3 are full.' },
        ],
        tip: 'Spend tokens before all 3 slots fill up, or your Integrity Points will stop building.',
    },
    gestures: {
        title: 'Quick Actions',
        icon: 'hand-left',
        summary: 'Swipe tasks to take quick action without opening them.',
        items: [
            { icon: 'arrow-forward', text: 'Swipe right to complete (or reopen if already done)' },
            { icon: 'arrow-back', text: 'Swipe left to delete' },
            { icon: 'time', text: 'You get 5 seconds to undo any action' },
            { icon: 'ellipsis-horizontal', text: 'Long-press for more options (reschedule, tags)' },
        ],
        tip: 'All actions can be undone within 5 seconds.',
    },
};

// ─── Component ───────────────────────────────────────

interface InfoSheetProps {
    visible: boolean;
    content: InfoContent | null;
    onClose: () => void;
    headerVisual?: React.ReactNode;
}

export default function InfoSheet({ visible, content, onClose, headerVisual }: InfoSheetProps) {
    const { colors } = useTheme();
    const slideAnim = useRef(new Animated.Value(400)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const animatedDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 400, duration: 250, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onCloseRef.current());
    };

    const onHandleGesture = (e: any) => {
        const dy = e.nativeEvent.translationY;
        if (dy > 0) {
            slideAnim.setValue(dy);
            overlayAnim.setValue(Math.max(0, 1 - dy / 400));
        }
    };

    const onHandleStateChange = (e: any) => {
        if (e.nativeEvent.oldState === State.ACTIVE) {
            const { translationY, velocityY } = e.nativeEvent;
            if (translationY > 100 || velocityY > 500) {
                Animated.parallel([
                    Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
                    Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
                ]).start(() => onCloseRef.current());
            } else {
                Animated.parallel([
                    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
                    Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                ]).start();
            }
        }
    };

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(400);
            overlayAnim.setValue(0);
            const anim = Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    ...animations.spring,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        } else {
            const anim = Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 400,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        }
    }, [visible]);

    if (!visible && !content) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.root}>
                {/* Backdrop — visual only */}
                <Animated.View
                    style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: overlayAnim }]}
                    pointerEvents="none"
                />

                {/* Tappable area above sheet */}
                <Pressable style={{ flex: 1 }} onPress={animatedDismiss} />

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surfaceElevated,
                            transform: [{ translateY: slideAnim }],
                        },
                        shadows.lg,
                    ]}
                >
                    <PanGestureHandler
                        onGestureEvent={onHandleGesture}
                        onHandlerStateChange={onHandleStateChange}
                        activeOffsetY={10}
                        failOffsetX={[-20, 20]}
                    >
                        <Animated.View style={styles.handleArea}>
                            <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        </Animated.View>
                    </PanGestureHandler>

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {content && (
                            <>
                                {/* Header */}
                                <View style={styles.headerRow}>
                                    <View style={[styles.iconCircle, { backgroundColor: (content.iconColor ?? colors.primary) + '18' }]}>
                                        <Ionicons
                                            name={content.icon as any}
                                            size={22}
                                            color={content.iconColor ?? colors.primary}
                                        />
                                    </View>
                                    <Text style={[styles.title, { color: colors.textPrimary }]}>
                                        {content.title}
                                    </Text>
                                </View>

                                {/* Summary */}
                                <Text style={[styles.summary, { color: colors.textSecondary }]}>
                                    {content.summary}
                                </Text>

                                {/* Live visual (streak dots, boost icons, etc.) */}
                                {headerVisual && (
                                    <View style={styles.visualBlock}>
                                        {headerVisual}
                                    </View>
                                )}

                                {/* Items */}
                                <View style={[styles.itemList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    {content.items.map((item, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.item,
                                                i < content.items.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                                            ]}
                                        >
                                            <Ionicons
                                                name={item.icon as any}
                                                size={16}
                                                color={item.text.startsWith('+') ? colors.success : item.text.startsWith('-') ? colors.danger : colors.primary}
                                            />
                                            <Text style={[styles.itemText, { color: colors.textPrimary }]}>
                                                {item.text}
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                {/* Tip */}
                                {content.tip && (
                                    <View style={[styles.tipBox, { backgroundColor: colors.primaryMuted }]}>
                                        <Ionicons name="bulb" size={14} color={colors.primary} />
                                        <Text style={[styles.tipText, { color: colors.primary }]}>
                                            {content.tip}
                                        </Text>
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    sheet: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxl + 20,
        maxHeight: '85%',
    },
    handleArea: {
        alignItems: 'center',
        paddingVertical: 20,
        cursor: 'grab' as any,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        opacity: 0.3,
    },
    content: {
        marginTop: spacing.xs,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        ...typography.headlineMedium,
        fontSize: 20,
    },
    summary: {
        ...typography.body,
        lineHeight: 22,
        marginBottom: spacing.lg,
    },
    visualBlock: {
        marginBottom: spacing.lg,
    },
    itemList: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: spacing.md,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
    },
    itemText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
});
