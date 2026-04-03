import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    PanResponder,
    Dimensions,
    Animated,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { format, parseISO, subDays, startOfWeek, addDays, addWeeks, subWeeks, isSameMonth, endOfWeek } from 'date-fns';

import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { spacing, borderRadius, typography } from '../theme';
import { Task, Tag, UserState, BOOST_CONFIG } from '../types';
import * as TaskService from '../services/taskService';
import * as TagService from '../services/tagService';
import { awardClosePoints, penalizeDeleteOverdue, penalizeUncompletion, getUserState } from '../services/integrityService';
import { recordClosure, unrecordClosure } from '../services/streakService';
import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import { Card, Badge, IconBox, layout } from '../components/ds';
import PressableScale from '../components/PressableScale';
import { syncInBackground } from '../services/syncService';
import { useSync } from '../context/SyncContext';
import InfoSheet, { InfoContent } from '../components/InfoSheet';
import WeeklyTrends from '../components/WeeklyTrends';
import EmptyState from '../components/EmptyState';

const DAY_PAGE_SIZE = 6;

interface WeekCell {
    key: string;
    date: Date;
    closedCount: number;
}

function toDayKey(d: Date): string {
    return format(d, 'yyyy-MM-dd');
}

function buildWeekCells(anchor: Date, closedByDate: Record<string, number>): WeekCell[] {
    const weekStart = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const key = toDayKey(date);
        return { key, date, closedCount: closedByDate[key] ?? 0 };
    });
}

function weekRangeLabel(anchor: Date): string {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    const end = endOfWeek(anchor, { weekStartsOn: 1 });
    if (isSameMonth(start, end)) {
        return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
    }
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
}

export default function ReviewDashboardScreen() {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dayVisibleCount, setDayVisibleCount] = useState(DAY_PAGE_SIZE);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [userState, setUserState] = useState<UserState | null>(null);
    const [infoContent, setInfoContent] = useState<InfoContent | null>(null);
    const { lastSyncAt, triggerSync } = useSync();

    // ─── Entrance animation
    const screenOpacity = useRef(new Animated.Value(0)).current;
    const screenTranslateY = useRef(new Animated.Value(14)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(screenOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(screenTranslateY, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }),
        ]).start();
    }, []);

    // Undo system
    const pendingActions = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; undo: () => void }>>(new Map());
    const UNDO_DELAY = 5000;

    useEffect(() => {
        return () => { pendingActions.current.forEach(({ timer }) => clearTimeout(timer)); };
    }, []);

    const selectedDateKey = toDayKey(selectedDate);
    const todayKey = toDayKey(new Date());
    const isToday = selectedDateKey === todayKey;

    useEffect(() => {
        setDayVisibleCount(DAY_PAGE_SIZE);
    }, [selectedDateKey]);

    const loadData = useCallback(async () => {
        const [allTasks, tags, state] = await Promise.all([
            TaskService.getAllTasks(),
            TagService.getAllTags(),
            getUserState(),
        ]);
        setTasks(allTasks);
        setAllTags(tags);
        setUserState(state);
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData, lastSyncAt])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await triggerSync();
        await loadData();
        setRefreshing(false);
    };

    // ─── Deferred Undo Helper ─────────────────────────────

    const deferAction = useCallback((
        task: Task,
        message: string,
        icon: string,
        commit: () => Promise<void>,
    ) => {
        const existing = pendingActions.current.get(task.id);
        if (existing) { clearTimeout(existing.timer); pendingActions.current.delete(task.id); }

        setTasks((prev) => prev.filter((t) => t.id !== task.id));

        const timer = setTimeout(async () => {
            pendingActions.current.delete(task.id);
            await commit();
            syncInBackground();
        }, UNDO_DELAY);

        pendingActions.current.set(task.id, {
            timer,
            undo: () => {
                clearTimeout(timer);
                pendingActions.current.delete(task.id);
                loadData();
            },
        });

        showToast(message, 'info', icon, {
            actionLabel: 'Undo',
            duration: UNDO_DELAY,
            onAction: () => {
                const pending = pendingActions.current.get(task.id);
                pending?.undo();
            },
        });
    }, [loadData, showToast]);

    // ─── Task actions ─────────────────────────────────────

    const handleClose = (task: Task) => {
        const closeType = TaskService.getCloseType(task);
        deferAction(task, 'Task closed', '✓', async () => {
            await TaskService.closeTask(task.id);
            await awardClosePoints(task, closeType);
            await recordClosure();
            await loadData();
        });
    };

    const handleUncomplete = (task: Task) => {
        deferAction(task, 'Marked as open', '↺', async () => {
            await TaskService.uncompleteTask(task.id);
            await penalizeUncompletion(task.id);
            await unrecordClosure();
            await loadData();
        });
    };

    const handleReschedule = async (task: Task, date: string) => {
        const count = await TaskService.getTodayRescheduleCount();
        const result = await TaskService.rescheduleTask(task.id, date, count);

        if (!result.success) {
            showToast('Reschedule limit reached', 'warning', '⚠');
            return;
        }

        showToast('Rescheduled', 'info', '📅');
        await loadData();
        syncInBackground();
    };

    const handleDelete = (task: Task) => {
        const msg = task.status === 'overdue' ? 'Deleted overdue task' : 'Task deleted';
        deferAction(task, msg, '🗑', async () => {
            if (task.status === 'overdue') await penalizeDeleteOverdue(task.id);
            await TaskService.deleteTask(task.id);
            await loadData();
        });
    };

    // ─── Calendar navigation ─────────────────────────────

    const goWeek = useCallback((dir: 1 | -1) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        LayoutAnimation.configureNext({
            duration: 200,
            update: { type: 'easeInEaseOut' },
            create: { type: 'easeInEaseOut', property: 'opacity' },
            delete: { type: 'easeInEaseOut', property: 'opacity' },
        });
        setSelectedDate((prev) => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    }, []);

    const goToToday = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        LayoutAnimation.configureNext({
            duration: 200,
            update: { type: 'easeInEaseOut' },
            create: { type: 'easeInEaseOut', property: 'opacity' },
            delete: { type: 'easeInEaseOut', property: 'opacity' },
        });
        setSelectedDate(new Date());
    };

    const calendarPan = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
            onPanResponderRelease: (_, g) => {
                if (g.dx < -50) goWeek(1);
                else if (g.dx > 50) goWeek(-1);
            },
        })
    ).current;

    // ─── Derived data ────────────────────────────────────

    const closedByDate = useMemo(() => {
        const map: Record<string, number> = {};
        tasks.forEach((task) => {
            if (task.status !== 'closed' || !task.closedAt) return;
            const key = task.closedAt.slice(0, 10);
            map[key] = (map[key] ?? 0) + 1;
        });
        return map;
    }, [tasks]);

    const weekCells = useMemo(
        () => buildWeekCells(selectedDate, closedByDate),
        [selectedDate, closedByDate],
    );

    const filteredTasks = tasks;

    const closedOnDay = useMemo(
        () => filteredTasks
            .filter((t) => t.status === 'closed' && !!t.closedAt && t.closedAt.startsWith(selectedDateKey))
            .sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || '')),
        [filteredTasks, selectedDateKey],
    );

    const stats = useMemo(() => {
        const closedToday = closedByDate[todayKey] ?? 0;
        const now = new Date();
        const last7 = tasks.filter((t) => {
            if (t.status !== 'closed' || !t.closedAt) return false;
            return parseISO(t.closedAt) >= subDays(now, 6);
        }).length;
        const prev7 = tasks.filter((t) => {
            if (t.status !== 'closed' || !t.closedAt) return false;
            const d = parseISO(t.closedAt);
            return d >= subDays(now, 13) && d < subDays(now, 6);
        }).length;
        const weekDelta = last7 - prev7;

        return {
            closedToday,
            last7,
            weekDelta,
            openCount: tasks.filter((t) => t.status === 'open').length,
            overdueCount: tasks.filter((t) => t.status === 'overdue').length,
        };
    }, [tasks, closedByDate, todayKey]);

    // ─── Visible slices ──────────────────────────────────

    const dayVisible = closedOnDay.slice(0, dayVisibleCount);
    const hasMoreDay = closedOnDay.length > dayVisibleCount;

    // ─── Render ──────────────────────────────────────────

    const effectiveStreak = (userState?.streak ?? 0) + (stats.closedToday > 0 ? 1 : 0);

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.accentMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.primaryMuted }]} />
            </View>
            <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + layout.screenTopGap, paddingBottom: tabBarHeight + 20 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ─────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Review</Text>
                    <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
                        {format(new Date(), 'EEEE, MMM d')}
                    </Text>
                </View>

                {/* ── Quick bar ──────────────────────────── */}
                <View style={styles.quickBar}>
                    <Ionicons name="flame" size={13} color={effectiveStreak > 0 ? colors.accent : colors.textMuted} />
                    <Text style={[styles.quickText, { color: colors.textSecondary }]}>
                        {effectiveStreak}-day streak
                    </Text>
                    <Text style={[styles.quickSep, { color: colors.border }]}>·</Text>
                    <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.quickText, { color: colors.textSecondary }]}>
                        {userState?.integrityPoints ?? 0}/{BOOST_CONFIG.THRESHOLD} pts
                    </Text>
                    {(userState?.boostTokens ?? 0) > 0 && (
                        <>
                            <Text style={[styles.quickSep, { color: colors.border }]}>·</Text>
                            <Ionicons name="flash" size={13} color={colors.boost ?? colors.accent} />
                            <Text style={[styles.quickText, { color: colors.textSecondary }]}>
                                {userState?.boostTokens} boost{(userState?.boostTokens ?? 0) !== 1 ? 's' : ''}
                            </Text>
                        </>
                    )}
                </View>

                {/* ── Calendar card ──────────────────────── */}
                <Card style={styles.calendarCard}>
                    <View style={styles.monthNav}>
                        <TouchableOpacity onPress={() => goWeek(-1)} hitSlop={16} style={[styles.monthArrow, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <View style={styles.monthLabelWrap}>
                            <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
                                <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
                                    {weekRangeLabel(selectedDate)}
                                </Text>
                            </TouchableOpacity>
                            {!isToday && (
                                <TouchableOpacity onPress={goToToday} style={[styles.todayPill, { backgroundColor: colors.primary + '18' }]}>
                                    <Text style={[styles.todayPillText, { color: colors.primary }]}>Today</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity onPress={() => goWeek(1)} hitSlop={16} style={[styles.monthArrow, { backgroundColor: colors.surface }]}>
                            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.grid} {...calendarPan.panHandlers}>
                        {weekCells.map((cell) => {
                            const isSel = cell.key === selectedDateKey;
                            const isActualToday = cell.key === todayKey;
                            const hasClosed = cell.closedCount > 0;

                            return (
                                <PressableScale
                                    key={cell.key}
                                    style={[
                                        styles.dayCell,
                                        isSel && { backgroundColor: colors.primary },
                                        isActualToday && !isSel && { backgroundColor: colors.primary + '14' },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                                        setSelectedDate(cell.date);
                                    }}
                                    scaleTo={0.88}
                                >
                                    <Text style={[styles.weekDayLabel, { color: isActualToday && !isSel ? colors.primary : isSel ? colors.primaryContrast : colors.textMuted }]}>
                                        {format(cell.date, 'EEEEE')}
                                    </Text>
                                    <Text style={[
                                        styles.dayNum,
                                        {
                                            color: isSel
                                                ? colors.primaryContrast
                                                : isActualToday
                                                    ? colors.primary
                                                    : colors.textPrimary,
                                            fontWeight: isActualToday || isSel ? '700' : '400',
                                        },
                                    ]}>
                                        {cell.date.getDate()}
                                    </Text>
                                    {hasClosed && !isSel && (
                                        <View style={[styles.dayDot, { backgroundColor: colors.success }]} />
                                    )}
                                    {hasClosed && isSel && (
                                        <Text style={[styles.dayBadge, { color: colors.primaryContrast }]}>
                                            {cell.closedCount}
                                        </Text>
                                    )}
                                </PressableScale>
                            );
                        })}
                    </View>
                </Card>

                {/* ── Selected day detail ────────────────── */}
                <Card style={styles.cardSpaced}>
                    <View style={styles.dayDetailHeader}>
                        <View style={styles.dayDetailLeft}>
                            <Ionicons
                                name={closedOnDay.length > 0 ? 'checkmark-done-outline' : 'calendar-outline'}
                                size={16}
                                color={closedOnDay.length > 0 ? colors.success : colors.textMuted}
                            />
                            <Text style={[styles.dayDetailTitle, { color: colors.textPrimary }]}>
                                {isToday ? 'Closed today' : format(selectedDate, 'EEE, MMM d')}
                            </Text>
                        </View>
                        {closedOnDay.length > 0 && (
                            <Badge count={closedOnDay.length} color={colors.success} />
                        )}
                    </View>

                    {dayVisible.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <EmptyState
                                icon="calendar-outline"
                                title="No closures today"
                                message="Select a different day on the calendar above to view your past momentum."
                            />
                        </View>
                    ) : (
                        <View style={styles.rowGroup}>
                            {dayVisible.map((t) => (
                                <TaskCard
                                    key={t.id}
                                    task={t}
                                    allTags={allTags}
                                    showClosedAt
                                    onUncomplete={handleUncomplete}
                                    onDelete={handleDelete}
                                    onPress={setSelectedTask}
                                />
                            ))}
                        </View>
                    )}

                    {hasMoreDay && (
                        <TouchableOpacity
                            style={[styles.moreBtn, { backgroundColor: colors.surface }]}
                            onPress={() => setDayVisibleCount((p) => p + DAY_PAGE_SIZE)}
                        >
                            <Text style={[styles.moreTxt, { color: colors.primary }]}>
                                Show {Math.min(DAY_PAGE_SIZE, closedOnDay.length - dayVisibleCount)} more
                            </Text>
                        </TouchableOpacity>
                    )}

                    {dayVisibleCount > DAY_PAGE_SIZE && (
                        <TouchableOpacity
                            style={[styles.moreBtn, { backgroundColor: colors.surface }]}
                            onPress={() => setDayVisibleCount(DAY_PAGE_SIZE)}
                        >
                            <Text style={[styles.moreTxt, { color: colors.textSecondary }]}>Collapse</Text>
                        </TouchableOpacity>
                    )}
                </Card>

                {/* ── 7-Day Trends ──────────────────────── */}
                <Card style={[styles.cardSpaced, { marginBottom: spacing.lg }]}>
                    <View style={styles.cardTitleRow}>
                        <IconBox icon="bar-chart-outline" color={colors.primary} />
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>7-Day Trends</Text>
                        {stats.weekDelta !== 0 && (
                            <View style={[styles.deltaBadge, { backgroundColor: stats.weekDelta > 0 ? colors.success + '18' : colors.danger + '18' }]}>
                                <Text style={[styles.deltaText, { color: stats.weekDelta > 0 ? colors.success : colors.danger }]}>
                                    {stats.weekDelta > 0 ? `+${stats.weekDelta}` : stats.weekDelta} vs prev week
                                </Text>
                            </View>
                        )}
                    </View>
                    <WeeklyTrends closedByDate={closedByDate} />
                </Card>

                <View style={{ height: spacing.xl }} />
            </ScrollView>
            </Animated.View>

            <TaskModal
                visible={!!selectedTask}
                mode="view"
                task={selectedTask}
                allTags={allTags}
                onClose={() => setSelectedTask(null)}
                onToggleStatus={async (task) => {
                    if (task.status === 'closed') {
                        await handleUncomplete(task);
                    } else {
                        await handleClose(task);
                    }
                    setSelectedTask(null);
                }}
                onDelete={async (task) => {
                    await handleDelete(task);
                    setSelectedTask(null);
                }}
                onReschedule={async (task, date) => {
                    await handleReschedule(task, date);
                    setSelectedTask(null);
                }}
                onSaveEdit={async (task, changes) => {
                    if (changes.title) await TaskService.updateTaskTitle(task.id, changes.title);
                    if (changes.description !== undefined) await TaskService.updateTaskDescription(task.id, changes.description);
                    if (changes.tags) await TaskService.updateTaskTags(task.id, changes.tags);
                    if (changes.recurrence !== undefined) await TaskService.updateTaskRecurrence(task.id, changes.recurrence);
                    setSelectedTask(null);
                    await loadData();
                    syncInBackground();
                }}
            />

            <InfoSheet
                visible={!!infoContent}
                content={infoContent}
                onClose={() => setInfoContent(null)}
            />
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1 },

    // ── Backdrop orbs
    backdropLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    backdropOrbTop: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: borderRadius.full,
        top: -120,
        left: -80,
        opacity: 0.55,
    },
    backdropOrbBottom: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: borderRadius.full,
        bottom: -150,
        right: -90,
        opacity: 0.4,
    },

    scroll: {
        paddingHorizontal: layout.screenPaddingX,
    },

    // ── Header
    header: {
        marginBottom: layout.sectionGap,
    },
    screenTitle: {
        ...typography.h1,
    },
    screenSubtitle: {
        ...typography.bodyMedium,
        marginTop: spacing['2xs'],
    },

    // ── Quick bar
    quickBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: layout.sectionGap,
        flexWrap: 'wrap',
    },
    quickText: {
        fontSize: 13,
        fontWeight: '500',
    },
    quickSep: {
        fontSize: 13,
        marginHorizontal: 2,
        opacity: 0.4,
    },

    // ── Delta badge (trends card title)
    deltaBadge: {
        marginLeft: 'auto' as any,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
    },
    deltaText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // ── Card spacing
    calendarCard: {
        marginBottom: layout.cardGap,
    },
    cardSpaced: {
        marginBottom: layout.cardGap,
    },

    // ── Card title
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md - spacing['2xs'],
        marginBottom: spacing.md,
    },
    cardTitle: {
        ...typography.headlineSmall,
    },

    // ── Calendar
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    monthLabelWrap: { alignItems: 'center', gap: 4 },
    monthArrow: {
        width: 32,
        height: 32,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthTitle: {
        ...typography.headlineSmall,
        fontSize: 16,
        fontWeight: '600',
    },
    todayPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    todayPillText: { fontSize: 11, fontWeight: '600' },

    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 4,
    },
    dayCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.lg,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.xs,
        borderRadius: borderRadius.md,
    },
    weekDayLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    dayNum: {
        fontSize: 15,
    },
    dayDot: {
        width: 4,
        height: 4,
        borderRadius: 999,
        position: 'absolute',
        bottom: 8,
    },
    dayBadge: {
        fontSize: 9,
        fontWeight: '700',
        position: 'absolute',
        bottom: 4,
    },

    // ── Day detail
    dayDetailHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    dayDetailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.sectionHeaderGap,
    },
    dayDetailTitle: {
        ...typography.bodyMedium,
        fontWeight: '600',
        fontSize: 15,
    },
    emptyContainer: { alignItems: 'center', paddingVertical: spacing.xl },
    
    // ── Sections
    section: {
        marginBottom: spacing.md,
    },
    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: layout.sectionHeaderGap,
        marginBottom: spacing.xs + spacing['2xs'],
    },
    sectionLabel: {
        ...typography.caption,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // ── Task rows
    rowGroup: {
        gap: layout.chipGap,
    },

    // ── More / Collapse
    moreBtn: {
        marginTop: spacing.sm,
        alignSelf: 'center',
        borderRadius: borderRadius.full,
        paddingVertical: 7,
        paddingHorizontal: spacing.lg,
    },
    moreTxt: {
        fontSize: 12,
        fontWeight: '600',
    },

});
