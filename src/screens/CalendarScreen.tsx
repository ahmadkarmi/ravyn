// Ravyn — Calendar Screen
// Monthly calendar with task list for selected day. Matches Review screen patterns.

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    RefreshControl,
    Modal,
    PanResponder,
    Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, addMonths, subMonths, isToday, isSameDay, isSameMonth,
} from 'date-fns';

import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { spacing, borderRadius, typography } from '../theme';
import { Task, Tag } from '../types';
import * as TaskService from '../services/taskService';
import * as TagService from '../services/tagService';
import { awardClosePoints, penalizeDeleteOverdue, penalizeUncompletion } from '../services/integrityService';
import { recordClosure } from '../services/streakService';
import { syncInBackground } from '../services/syncService';
import { useSync } from '../context/SyncContext';
import TaskModal from '../components/TaskModal';
import TaskCard from '../components/TaskCard';
import EmptyState from '../components/EmptyState';
import { Card, Chip, Badge, layout } from '../components/ds';
import PressableScale from '../components/PressableScale';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarScreen() {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();

    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [filterTagId, setFilterTagId] = useState<string | null>(null);
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

    // ─── Undo system ──────────────────────────────────────
    const pendingActions = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; undo: () => void }>>(new Map());
    const UNDO_DELAY = 5000;

    useEffect(() => {
        return () => { pendingActions.current.forEach(({ timer }) => clearTimeout(timer)); };
    }, []);

    const loadData = useCallback(async () => {
        const [all, tags] = await Promise.all([TaskService.getAllTasks(), TagService.getAllTags()]);
        setTasks(all);
        setAllTags(tags);
        setFilterTagId((prev) => {
            if (prev && !tags.some((t) => t.id === prev)) return null;
            return prev;
        });
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData, lastSyncAt]));

    const onRefresh = async () => {
        setRefreshing(true);
        await triggerSync();
        await loadData();
        setRefreshing(false);
    };

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
            undo: () => { clearTimeout(timer); pendingActions.current.delete(task.id); loadData(); },
        });
        showToast(message, 'info', icon, {
            actionLabel: 'Undo', duration: UNDO_DELAY,
            onAction: () => { pendingActions.current.get(task.id)?.undo(); },
        });
    }, [loadData, showToast]);

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
            await loadData();
        });
    };

    const handleReschedule = async (task: Task, date: string) => {
        const count = await TaskService.getTodayRescheduleCount();
        const result = await TaskService.rescheduleTask(task.id, date, count);
        if (!result.success) { showToast('Reschedule limit reached', 'warning', '⚠'); return; }
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

    const calendarCells = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end }).map((date) => ({
            date,
            key: format(date, 'yyyy-MM-dd'),
            isCurrentMonth: date.getMonth() === currentMonth.getMonth(),
        }));
    }, [currentMonth]);

    const tasksByDate = useMemo(() => {
        const map: Record<string, Task[]> = {};
        for (const t of tasks) {
            if (t.dueDate) {
                if (!map[t.dueDate]) map[t.dueDate] = [];
                map[t.dueDate].push(t);
            }
        }
        return map;
    }, [tasks]);

    const filteredTasks = useMemo(() =>
        filterTagId ? tasks.filter((t) => t.tags?.includes(filterTagId)) : tasks,
    [tasks, filterTagId]);

    const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

    const selectedTasks = useMemo(() => {
        const base = filterTagId
            ? filteredTasks.filter((t) => t.dueDate === selectedDateStr)
            : (tasksByDate[selectedDateStr] ?? []);
        return [...base].sort((a, b) => {
            const o: Record<string, number> = { overdue: 0, open: 1, closed: 2 };
            return (o[a.status] ?? 1) - (o[b.status] ?? 1);
        });
    }, [filteredTasks, tasksByDate, selectedDateStr, filterTagId]);

    const goMonth = useCallback((dir: 1 | -1) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        setCurrentMonth((prev) => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
    }, []);

    const goToday = () => {
        const now = new Date();
        setCurrentMonth(now);
        setSelectedDate(now);
    };

    const swipePan = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
            if (g.dx < -50) goMonth(1);
            else if (g.dx > 50) goMonth(-1);
        },
    })).current;

    const isCurrentMonthToday = isSameMonth(currentMonth, new Date());

    const daySummary = useMemo(() => ({
        total: selectedTasks.length,
        closed: selectedTasks.filter((t) => t.status === 'closed').length,
        open: selectedTasks.filter((t) => t.status === 'open').length,
        overdue: selectedTasks.filter((t) => t.status === 'overdue').length,
    }), [selectedTasks]);

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.accentMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.primaryMuted }]} />
            </View>

            <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
            <ScrollView
                contentContainerStyle={[styles.scroll, { paddingTop: insets.top + layout.screenTopGap, paddingBottom: tabBarHeight + 20 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* ── Header */}
                <View style={styles.header}>
                    <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Calendar</Text>
                    <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
                        {format(new Date(), 'EEEE, MMM d')}
                    </Text>
                </View>

                {/* ── Tag filter */}
                {allTags.length > 0 && (
                    <View style={styles.tagFilterSection}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            <View style={styles.tagFilterRow}>
                                <Chip
                                    label="All"
                                    color={!filterTagId ? colors.primary : colors.textSecondary}
                                    variant={!filterTagId ? 'solid' : 'tinted'}
                                    onPress={() => setFilterTagId(null)}
                                />
                                {allTags.map((tag) => (
                                    <Chip
                                        key={tag.id}
                                        label={tag.label}
                                        color={tag.color}
                                        variant={filterTagId === tag.id ? 'solid' : 'tinted'}
                                        onPress={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                                    />
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                )}

                {/* ── Back to today (shown when not on today) */}
                {!isToday(selectedDate) && (
                    <View style={styles.backToTodayRow}>
                        <PressableScale
                            style={[styles.backToTodayPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}
                            onPress={() => { goToday(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); }}
                            scaleTo={0.93}
                        >
                            <Text style={[styles.backToTodayText, { color: colors.primary }]}>Back to today</Text>
                            <Ionicons name="arrow-down-outline" size={13} color={colors.primary} />
                        </PressableScale>
                    </View>
                )}

                {/* ── Date picker button */}
                <PressableScale
                    style={[styles.datePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setCalendarVisible(true)}
                    scaleTo={0.97}
                >
                    <View style={styles.datePickerInner}>
                        <View style={[styles.datePickerIcon, { backgroundColor: colors.primary + '14' }]}>
                            <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                        </View>
                        <View style={styles.datePickerText}>
                            <Text style={[styles.datePickerSub, { color: colors.textMuted }]}>
                                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEEE')}
                            </Text>
                            <Text style={[styles.datePickerMain, { color: colors.textPrimary }]}>
                                {format(selectedDate, 'MMMM d, yyyy')}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </PressableScale>

                {/* ── Day summary strip */}
                {daySummary.total > 0 && (
                    <View style={[styles.summaryStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{daySummary.total}</Text>
                            <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>tasks</Text>
                        </View>
                        {daySummary.closed > 0 && (
                            <>
                                <View style={[styles.summarySep, { backgroundColor: colors.border }]} />
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryVal, { color: colors.success }]}>{daySummary.closed}</Text>
                                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>closed</Text>
                                </View>
                            </>
                        )}
                        {daySummary.open > 0 && (
                            <>
                                <View style={[styles.summarySep, { backgroundColor: colors.border }]} />
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryVal, { color: colors.primary }]}>{daySummary.open}</Text>
                                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>open</Text>
                                </View>
                            </>
                        )}
                        {daySummary.overdue > 0 && (
                            <>
                                <View style={[styles.summarySep, { backgroundColor: colors.border }]} />
                                <View style={styles.summaryItem}>
                                    <Text style={[styles.summaryVal, { color: colors.danger }]}>{daySummary.overdue}</Text>
                                    <Text style={[styles.summaryLbl, { color: colors.textMuted }]}>overdue</Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* ── Task list for selected day */}
                <View style={styles.sectionHeader}>
                    <Ionicons
                        name={selectedTasks.length > 0 ? 'checkmark-done-outline' : 'calendar-outline'}
                        size={15}
                        color={isToday(selectedDate) ? colors.primary : colors.textMuted}
                    />
                    <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'EEE, MMM d')}
                    </Text>
                    {selectedTasks.length > 0 && <Badge count={selectedTasks.length} color={colors.primary} />}
                </View>

                {selectedTasks.length === 0 ? (
                    <Card style={styles.emptyCard}>
                        <EmptyState
                            icon="calendar-outline"
                            title="Nothing scheduled"
                            message="Tap the date above to browse another day."
                        />
                    </Card>
                ) : (
                    <View style={styles.rowGroup}>
                        {selectedTasks.map((t) => (
                            <TaskCard
                                key={t.id}
                                task={t}
                                allTags={allTags}
                                onPress={setSelectedTask}
                                onClose={t.status !== 'closed' ? handleClose : undefined}
                                onUncomplete={t.status === 'closed' ? handleUncomplete : undefined}
                                onDelete={handleDelete}
                            />
                        ))}
                    </View>
                )}

                {/* paddingBottom on contentContainerStyle handles bottom clearance */}
            </ScrollView>
            </Animated.View>

            {/* ── Calendar picker modal */}
            <Modal
                visible={calendarVisible}
                animationType="fade"
                transparent
                statusBarTranslucent
                onRequestClose={() => setCalendarVisible(false)}
            >
                {/* Dimmed backdrop */}
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setCalendarVisible(false)}
                />

                {/* Floating card */}
                <View pointerEvents="box-none" style={styles.modalContainer}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card }]}>

                        {/* Header */}
                        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Pick a date</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                                    {format(currentMonth, 'MMMM yyyy')}
                                </Text>
                            </View>
                            <View style={styles.modalHeaderRight}>
                                {!isCurrentMonthToday && (
                                    <TouchableOpacity
                                        onPress={() => { goToday(); setCalendarVisible(false); }}
                                        style={[styles.todayPill, { backgroundColor: colors.primary + '18' }]}
                                    >
                                        <Text style={[styles.todayPillText, { color: colors.primary }]}>Today</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => setCalendarVisible(false)}
                                    hitSlop={12}
                                    style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                                >
                                    <Ionicons name="close" size={16} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Month navigation */}
                        <View style={styles.monthNav}>
                            <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={16} style={[styles.monthArrow, { backgroundColor: colors.surface }]}>
                                <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
                                {format(currentMonth, 'MMMM yyyy')}
                            </Text>
                            <TouchableOpacity onPress={() => goMonth(1)} hitSlop={16} style={[styles.monthArrow, { backgroundColor: colors.surface }]}>
                                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Week day labels */}
                        <View style={[styles.weekRow, { borderBottomColor: colors.border }]}>
                            {WEEK_DAYS.map((d) => (
                                <Text key={d} style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
                            ))}
                        </View>

                        {/* Month grid */}
                        <View style={styles.grid} {...swipePan.panHandlers}>
                            {calendarCells.map((cell) => {
                                const { date, key, isCurrentMonth: inMonth } = cell;
                                const isSelected = isSameDay(date, selectedDate);
                                const isTodayDate = isToday(date);
                                const dayTasks = tasksByDate[key] ?? [];
                                const hasOverdue = dayTasks.some((t) => t.status === 'overdue');
                                const hasOpen = dayTasks.some((t) => t.status === 'open');
                                const hasClosed = dayTasks.some((t) => t.status === 'closed');
                                return (
                                    <TouchableOpacity
                                        key={key}
                                        style={[
                                            styles.cell,
                                            isSelected && { backgroundColor: colors.primary },
                                            !isSelected && isTodayDate && { backgroundColor: colors.primary + '20' },
                                        ]}
                                        onPress={() => {
                                            setSelectedDate(date);
                                            setCalendarVisible(false);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[
                                            styles.dayNum,
                                            { color: !inMonth ? colors.textMuted + '50' : isSelected ? colors.primaryContrast : colors.textPrimary },
                                            isTodayDate && !isSelected && { fontWeight: '700', color: colors.primary },
                                        ]}>
                                            {format(date, 'd')}
                                        </Text>
                                        {dayTasks.length > 0 && (
                                            <View style={styles.dots}>
                                                {hasOverdue && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
                                                {hasOpen && !hasOverdue && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
                                                {hasClosed && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>

            <TaskModal
                visible={!!selectedTask}
                mode="view"
                task={selectedTask}
                allTags={allTags}
                onClose={() => setSelectedTask(null)}
                onToggleStatus={async (task) => {
                    if (task.status === 'closed') { handleUncomplete(task); } else { handleClose(task); }
                    setSelectedTask(null);
                }}
                onDelete={async (task) => { handleDelete(task); setSelectedTask(null); }}
                onReschedule={async (task, date) => { await handleReschedule(task, date); setSelectedTask(null); }}
                onSaveEdit={async (task, changes) => {
                    if (changes.title) await TaskService.updateTaskTitle(task.id, changes.title);
                    if (changes.description !== undefined) await TaskService.updateTaskDescription(task.id, changes.description);
                    if (changes.tags) await TaskService.updateTaskTags(task.id, changes.tags);
                    if (changes.recurrence !== undefined) await TaskService.updateTaskRecurrence(task.id, changes.recurrence);
                    if (changes.priority !== undefined) await TaskService.updateTaskPriority(task.id, changes.priority ?? undefined);
                    setSelectedTask(null);
                    await loadData();
                    syncInBackground();
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    backdropLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    backdropOrbTop: { position: 'absolute', width: 240, height: 240, borderRadius: borderRadius.full, top: -120, left: -80, opacity: 0.55 },
    backdropOrbBottom: { position: 'absolute', width: 260, height: 260, borderRadius: borderRadius.full, bottom: -150, right: -90, opacity: 0.4 },
    scroll: { paddingHorizontal: layout.screenPaddingX },
    header: { marginBottom: layout.sectionGap },
    screenTitle: { ...typography.h1 },
    screenSubtitle: { ...typography.bodyMedium, marginTop: spacing['2xs'] },
    tagFilterSection: { marginBottom: layout.sectionGap },
    tagFilterRow: { flexDirection: 'row', gap: layout.chipGap },
    cardSpaced: { marginBottom: layout.cardGap },

    // ── Date picker button
    datePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        marginBottom: layout.cardGap,
    },
    datePickerInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    datePickerIcon: {
        width: 36,
        height: 36,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    datePickerText: { gap: 2 },
    datePickerSub: { fontSize: 11, fontWeight: '500' },
    datePickerMain: { fontSize: 15, fontWeight: '600' },
    backToTodayRow: {
        alignItems: 'flex-end',
        marginTop: -spacing.xs,
        marginBottom: spacing.sm,
    },
    backToTodayPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        borderWidth: 1,
    },
    backToTodayText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // ── Day summary strip
    summaryStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        marginBottom: layout.cardGap,
        gap: spacing.lg,
    },
    summaryItem: { alignItems: 'center', gap: 2 },
    summaryVal: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
    summaryLbl: { fontSize: 11, fontWeight: '500' },
    summarySep: { width: 1, height: 28, opacity: 0.5 },

    // ── Modal overlay
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    modalCard: {
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.cardPadding,
        paddingTop: layout.cardPadding,
        paddingBottom: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    modalTitle: { ...typography.h3, fontSize: 16 },
    modalSubtitle: { fontSize: 12, fontWeight: '500', marginTop: 2 },
    modalHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    closeBtn: {
        width: 28,
        height: 28,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Month nav (inside modal)
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.cardPadding,
        paddingVertical: spacing.md,
    },
    monthArrow: { width: 32, height: 32, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
    monthTitle: { ...typography.headlineSmall, fontSize: 16, fontWeight: '600' },
    todayPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
    todayPillText: { fontSize: 11, fontWeight: '600' },
    weekRow: { flexDirection: 'row', paddingHorizontal: spacing.sm, paddingBottom: spacing.xs, borderBottomWidth: StyleSheet.hairlineWidth },
    weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.sm,
    },
    cell: {
        width: `${100 / 7}%` as any,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.md,
        paddingTop: 2,
    },
    dayNum: {
        fontSize: 14,
        fontWeight: '500',
    },
    dayCount: {
        fontSize: 8,
        fontWeight: '600',
        marginLeft: 1,
        lineHeight: 7,
        alignSelf: 'flex-end',
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        marginTop: 2,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    sectionTitle: { ...typography.h3, fontSize: 15 },
    emptyCard: { marginBottom: layout.cardGap, alignItems: 'center', paddingVertical: spacing.xl },
    rowGroup: { gap: layout.chipGap },
});
