// Ravyn — TaskCard Component (Detail Rich)
// Shows maximum value at a glance: Created, Due, Completed, Points.

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import type { PanGestureHandlerGestureEvent, PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Task, Tag } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const DELETE_REVEAL_WIDTH = 80;
const VELOCITY_THRESHOLD = 500;

interface TaskCardProps {
    task: Task;
    allTags?: Tag[];
    onClose?: (task: Task) => void;
    onUncomplete?: (task: Task) => void;
    onReschedule?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onPress?: (task: Task) => void;
    onLongPress?: (task: Task) => void;
    showActions?: boolean;
    actionButton?: boolean;   // inline ✓ button on title right (Review page)
    showClosedAt?: boolean;   // show "Closed X:XX" instead of due date
    index?: number;
}

export default function TaskCard({
    task,
    allTags = [],
    onClose,
    onUncomplete,
    onReschedule,
    onDelete,
    onPress,
    onLongPress,
    showActions = true,
    actionButton = false,
    showClosedAt = false,
    index = 0,
}: TaskCardProps) {
    const { colors } = useTheme();

    // Standard RN Animated values
    const translateX = useRef(new Animated.Value(0)).current;
    const entryOpacity = useRef(new Animated.Value(0)).current;
    const checkScale = useRef(new Animated.Value(1)).current;
    const cardScale = useRef(new Animated.Value(1)).current;
    const didHaptic = useRef(false);
    const [deleteRevealed, setDeleteRevealed] = useState(false);

    // Stable refs so gesture callbacks never go stale
    const taskRef = useRef(task);
    const onCloseRef = useRef(onClose);
    const onUncompleteRef = useRef(onUncomplete);
    const onDeleteRef = useRef(onDelete);
    taskRef.current = task;
    onCloseRef.current = onClose;
    onUncompleteRef.current = onUncomplete;
    onDeleteRef.current = onDelete;

    // Entry animation
    useEffect(() => {
        Animated.timing(entryOpacity, {
            toValue: 1, duration: 300, delay: Math.min(index, 8) * 45, useNativeDriver: true,
        }).start();
    }, []);

    const isClosed = task.status === 'closed';
    const isOverdue = task.status === 'overdue';

    const handleToggle = () => {
        if (isClosed) {
            Animated.sequence([
                Animated.timing(checkScale, { toValue: 0.7, duration: 60, useNativeDriver: true }),
                Animated.spring(checkScale, { toValue: 1, damping: 10, stiffness: 400, useNativeDriver: true }),
            ]).start();
            onUncompleteRef.current?.(taskRef.current);
            return;
        }
        // Close: checkbox bounce + card pulse, then commit
        Animated.parallel([
            Animated.sequence([
                Animated.timing(checkScale, { toValue: 0.6, duration: 60, useNativeDriver: true }),
                Animated.spring(checkScale, { toValue: 1, damping: 6, stiffness: 500, useNativeDriver: true }),
            ]),
            Animated.sequence([
                Animated.timing(cardScale, { toValue: 1.03, duration: 80, useNativeDriver: true }),
                Animated.timing(cardScale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]),
        ]).start(() => onCloseRef.current?.(taskRef.current));
    };

    // ─── Gesture ──────────────────────────────────────────

    const applyDrag = (dx: number) => {
        const sign = dx > 0 ? 1 : -1;
        const abs = Math.abs(dx);
        return sign * Math.min(abs * 0.65 + Math.sqrt(abs) * 2.5, SCREEN_WIDTH * 0.7);
    };

    const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX: tx } = event.nativeEvent;
        translateX.setValue(applyDrag(tx));

        const abs = Math.abs(tx);
        if (abs > SWIPE_THRESHOLD && !didHaptic.current) {
            didHaptic.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        } else if (abs < SWIPE_THRESHOLD) {
            didHaptic.current = false;
        }
    }, [translateX]);

    const onHandlerStateChange = useCallback((event: PanGestureHandlerStateChangeEvent) => {
        if (event.nativeEvent.oldState !== State.ACTIVE) return;
        didHaptic.current = false;

        const { translationX: tx, velocityX: vx } = event.nativeEvent;
        const passedRight = tx > SWIPE_THRESHOLD || (tx > 40 && vx > VELOCITY_THRESHOLD);
        const passedLeft = tx < -SWIPE_THRESHOLD || (tx < -40 && vx < -VELOCITY_THRESHOLD);
        const t = taskRef.current;

        if (passedRight) {
            Animated.timing(translateX, { toValue: SCREEN_WIDTH, duration: 180, useNativeDriver: true })
                .start(() => {
                    if (t.status === 'closed') onUncompleteRef.current?.(t);
                    else onCloseRef.current?.(t);
                });
        } else if (passedLeft && Math.abs(vx) > VELOCITY_THRESHOLD) {
            // Fast full swipe — immediate delete
            Animated.timing(translateX, { toValue: -SCREEN_WIDTH, duration: 180, useNativeDriver: true })
                .start(() => onDeleteRef.current?.(t));
        } else if (passedLeft) {
            // Slow swipe past threshold — reveal delete button
            setDeleteRevealed(true);
            Animated.spring(translateX, {
                toValue: -DELETE_REVEAL_WIDTH, useNativeDriver: true, tension: 120, friction: 10,
            }).start();
        } else {
            setDeleteRevealed(false);
            Animated.spring(translateX, {
                toValue: 0, useNativeDriver: true, tension: 200, friction: 7,
            }).start();
        }
    }, [translateX]);

    // ─── Helpers ──────────────────────────────────────────

    const formatDateShort = (iso?: string | null) => {
        if (!iso) return null;
        const d = iso.includes('T') ? parseISO(iso) : new Date(iso + 'T12:00:00');
        if (isToday(d)) return 'Today';
        if (isTomorrow(d)) return 'Tmrw';
        return format(d, 'MMM d');
    };

    const formatClosedAt = (iso?: string | null) => {
        if (!iso) return null;
        const d = parseISO(iso);
        const dateStr = isToday(d) ? 'Today' : format(d, 'MMM d');
        return `Closed ${dateStr}, ${format(d, 'h:mm a')}`;
    };

    const getPointsEstimate = () => {
        if (isClosed) return '+10';
        if (isOverdue) return '+2';
        return '+10';
    };

    const pColor = task.priority === 'high' ? '#E06C75' : task.priority === 'medium' ? '#E5A645' : task.priority === 'low' ? '#98C379' : null;
    const dueLabel = formatDateShort(task.dueDate);
    const closedLabel = task.status === 'closed' ? formatClosedAt(task.closedAt) : null;

    // Interpolate opacity so only the correct swipe bg is visible
    const rightSwipeOpacity = translateX.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 0, 1],
        extrapolate: 'clamp',
    });
    const leftSwipeOpacity = translateX.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [1, 0, 0],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View style={[styles.container, { opacity: entryOpacity }]}>
            {/* Swipe right background (complete / uncomplete) */}
            <Animated.View style={[styles.swipeBg, styles.swipeBgLeft, { backgroundColor: isClosed ? colors.warningDepth : colors.successDepth, opacity: rightSwipeOpacity }]}>
                <Ionicons name={isClosed ? 'arrow-undo' : 'checkmark-circle'} size={22} color="#FFF" style={{ marginLeft: 20 }} />
            </Animated.View>
            {/* Swipe left background (delete) */}
            <Animated.View style={[styles.swipeBg, styles.swipeBgRight, { backgroundColor: colors.danger, opacity: leftSwipeOpacity }]}>
                {deleteRevealed ? (
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
                            Animated.timing(translateX, { toValue: -SCREEN_WIDTH, duration: 180, useNativeDriver: true })
                                .start(() => onDelete?.(task));
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="trash" size={18} color="#FFF" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                ) : (
                    <Ionicons name="trash" size={22} color="#FFF" style={{ marginRight: 20 }} />
                )}
            </Animated.View>

            {/* Card Surface */}
            <PanGestureHandler
                activeOffsetX={[-15, 15]}
                failOffsetY={[-10, 10]}
                enabled={showActions}
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
            >
                <Animated.View style={{ transform: [{ translateX }, { scale: cardScale }] }}>
                    <Pressable
                        onPress={() => onPress?.(task)}
                        onLongPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
                            onLongPress?.(task);
                        }}
                        delayLongPress={400}
                        style={({ pressed }) => [
                            styles.card,
                            { backgroundColor: pressed ? colors.surfacePressed : colors.card },
                        ]}
                    >
                        {/* ── Title row ── */}
                        <View style={styles.titleRow}>
                            <Animated.View style={{ transform: [{ scale: checkScale }] }}>
                                <Pressable
                                    style={[styles.checkBox, {
                                        borderColor: isClosed ? colors.success : (pColor ?? colors.border),
                                        backgroundColor: isClosed ? colors.success : 'transparent',
                                    }]}
                                    onPress={() => {
                                        if (!showActions) return;
                                        handleToggle();
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                                    }}
                                >
                                    {isClosed && <Ionicons name="checkmark" size={11} color="#FFF" />}
                                </Pressable>
                            </Animated.View>

                            <Text style={[styles.title, {
                                color: isClosed ? colors.textMuted : colors.textPrimary,
                                textDecorationLine: isClosed ? 'line-through' : 'none',
                            }]} numberOfLines={2}>
                                {task.title}
                            </Text>

                            <View style={styles.titleRight}>
                                {pColor ? (
                                    <View style={[styles.priorityPill, { backgroundColor: pColor + '22', borderColor: pColor + '55' }]}>
                                        <View style={[styles.priorityDot, { backgroundColor: pColor }]} />
                                        <Text style={[styles.priorityLabel, { color: pColor }]}>
                                            {task.priority === 'high' ? 'High' : task.priority === 'medium' ? 'Mid' : 'Low'}
                                        </Text>
                                    </View>
                                ) : null}
                                {isOverdue && !isClosed ? (
                                    <View style={[styles.overdueBadge, { backgroundColor: colors.danger + '20' }]}>
                                        <Text style={[styles.overdueText, { color: colors.danger }]}>OVERDUE</Text>
                                    </View>
                                ) : null}
                                {actionButton ? (
                                    <Pressable
                                        style={[styles.actionBtn, { backgroundColor: colors.primaryMuted }]}
                                        onPress={() => { handleToggle(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); }}
                                    >
                                        <Ionicons name="checkmark" size={14} color={colors.primary} />
                                    </Pressable>
                                ) : null}
                            </View>
                        </View>

                        {/* ── Description ── */}
                        {task.description ? (
                            <Text style={[styles.descPreview, { color: colors.textMuted }]} numberOfLines={1}>
                                {task.description}
                            </Text>
                        ) : null}

                        {/* ── Separator ── */}
                        <View style={[styles.sep, { backgroundColor: colors.border + '60' }]} />

                        {/* ── Meta row ── */}
                        <View style={styles.metaRow}>
                            <View style={styles.metaLeft}>
                                {task.recurrence && (
                                    <View style={styles.tagItem}>
                                        <Ionicons name="repeat" size={10} color={colors.primary} />
                                        <Text style={[styles.tagLabel, { color: colors.primary }]}>
                                            {task.recurrence === 'daily' ? 'Daily' : task.recurrence === 'weekly' ? 'Weekly' : 'Monthly'}
                                        </Text>
                                    </View>
                                )}
                                {(task.tags ?? []).slice(0, 2).map((tagId) => {
                                    const tag = allTags.find((t) => t.id === tagId);
                                    if (!tag) return null;
                                    return (
                                        <View key={tagId} style={styles.tagItem}>
                                            <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                                            <Text style={[styles.tagLabel, { color: colors.textMuted }]} numberOfLines={1}>{tag.label}</Text>
                                        </View>
                                    );
                                })}
                                {(task.tags?.length ?? 0) > 2 && (
                                    <Text style={[styles.metaText, { color: colors.textMuted }]}>+{(task.tags?.length ?? 0) - 2}</Text>
                                )}
                                {task.reminderTime ? (
                                    <View style={styles.tagItem}>
                                        <Ionicons name="notifications-outline" size={10} color={colors.textMuted} />
                                        <Text style={[styles.tagLabel, { color: colors.textMuted }]}>{task.reminderTime}</Text>
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.metaRight}>
                                <Ionicons name="shield-checkmark" size={10} color={colors.textMuted} />
                                <Text style={[styles.metaText, { color: colors.textMuted }]}>{getPointsEstimate()}</Text>
                            </View>
                        </View>

                        {/* ── Date row ── */}
                        {(dueLabel || closedLabel) ? (
                            <View style={styles.dateRow}>
                                <Text style={[styles.dateText, { color: colors.textMuted }]}>
                                    {dueLabel ? `Due ${dueLabel}` : ''}
                                </Text>
                                <Text style={[styles.dateText, { color: colors.success }]}>
                                    {closedLabel ?? ''}
                                </Text>
                            </View>
                        ) : null}
                    </Pressable>
                </Animated.View>
            </PanGestureHandler>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 0,
        overflow: 'hidden',
        borderRadius: borderRadius.lg,
    },
    swipeBg: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
    },
    swipeBgLeft: {
        alignItems: 'flex-start',
    },
    swipeBgRight: {
        alignItems: 'flex-end',
    },
    card: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: borderRadius.lg,
        gap: 7,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    titleRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flexShrink: 0,
    },
    checkBox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        lineHeight: 21,
    },
    overdueBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        flexShrink: 0,
    },
    overdueText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    actionBtn: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    sep: {
        height: 1,
        marginLeft: 28,
    },
    descPreview: {
        fontSize: 12,
        lineHeight: 16,
        paddingLeft: 28,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: 28,
    },
    metaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        flexShrink: 1,
    },
    metaRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
    },
    tagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    tagDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tagLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    metaText: {
        fontSize: 11,
        fontWeight: '500',
    },
    metaSep: {
        fontSize: 11,
        fontWeight: '700',
    },
    priorityPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
    },
    priorityDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    priorityLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    deleteBtn: {
        width: DELETE_REVEAL_WIDTH,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    deleteBtnText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    dateRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 28,
        paddingTop: 2,
    },
    dateText: {
        fontSize: 11,
        fontWeight: '500',
    },
});
