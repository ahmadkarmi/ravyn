import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Animated,
    Platform,
    Image,
    Pressable,
    TextInput,
    Modal,
    Alert,
    AppState,
    AppStateStatus,
} from 'react-native';
import DraggableList, { DragParams } from '../components/DraggableList';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { localDateStr } from '../utils/dateUtils';
import { Task, Tag, UserState, PRIORITY_ORDER } from '../types';
import * as TaskService from '../services/taskService';
import * as TagService from '../services/tagService';
import { awardClosePoints, getUserState, saveUserState, penalizeUncompletion } from '../services/integrityService';
import {
    recordClosure,
    unrecordClosure,
    processDays,
    checkAutoDeclineBoost,
    useBoost,
    declineBoost,
    getAllDailyRecords,
} from '../services/streakService';
import BoostOfferModal from '../components/BoostOfferModal';
import { MilestoneModal } from '../components/Modals';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import EmptyState from '../components/EmptyState';
import AddTaskSheet from '../components/AddTaskSheet';
import ConfirmSheet from '../components/ConfirmSheet';
import { useAuth } from '../context/AuthContext';
import { Card, Chip, Badge, IconBox, TaskListSkeleton, layout } from '../components/ds';
import { syncInBackground } from '../services/syncService';
import { useSync } from '../context/SyncContext';
import InfoSheet, { INFO_CONTENT, InfoContent } from '../components/InfoSheet';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from '../components/KeyboardToolbar';
import GestureHint from '../components/GestureHint';
import PressableScale from '../components/PressableScale';
import StreakTimeline from '../components/StreakTimeline';
import BoostTokens from '../components/BoostTokens';
import OfflineBanner from '../components/OfflineBanner';
import { DailyRecord, BOOST_CONFIG, INTEGRITY_POINTS, RESCHEDULE_CONFIG } from '../types';
import { setBadgeCount, scheduleTaskReminder, refreshDailyNotifications } from '../services/notificationService';
import { maybeRequestReview } from '../services/ratingService';

// ─── Helpers ──────────────────────────────────────────────

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 5) return 'Still up?';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
}

function dateStr(d: Date): string {
    return localDateStr(d);
}

interface TaskSection {
    key: string;
    title: string;
    icon: string;
    data: Task[];
    accent?: string;
}

// ─── Component ────────────────────────────────────────────

export default function HomeScreen() {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const { showToast } = useToast();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const tabBarHeight = useBottomTabBarHeight();
    const { lastSyncAt, isSyncing, triggerSync } = useSync();

    // State
    const [tasks, setTasks] = useState<Task[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [userState, setUserState] = useState<UserState | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [taskModalVisible, setTaskModalVisible] = useState(false);
    const [taskModalTask, setTaskModalTask] = useState<Task | null>(null);
    const [addSheetVisible, setAddSheetVisible] = useState(false);
    const [sortSheetVisible, setSortSheetVisible] = useState(false);
    const [rescheduleConfirmFn, setRescheduleConfirmFn] = useState<(() => void) | null>(null);
    const [filterTagId, setFilterTagId] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<'default' | 'newest' | 'alpha'>('default');
    const [searchQuery, setSearchQuery] = useState('');
    const [infoContent, setInfoContent] = useState<InfoContent | null>(null);
    const [infoVisual, setInfoVisual] = useState<React.ReactNode>(null);
    const [dailyRecords, setDailyRecords] = useState<Record<string, DailyRecord>>({});
    const [closedTodayCount, setClosedTodayCount] = useState(0);
    const [boostOfferVisible, setBoostOfferVisible] = useState(false);
    const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
    const [milestoneModalValue, setMilestoneModalValue] = useState(0);

    const showInfo = useCallback((content: InfoContent, visual?: React.ReactNode) => {
        setInfoContent(content);
        setInfoVisual(visual ?? null);
    }, []);
    const closeInfo = useCallback(() => {
        setInfoContent(null);
        setInfoVisual(null);
    }, []);

    // Undo system: pending actions that commit after delay
    const pendingActions = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; undo: () => void; commit: () => Promise<void> }>>(new Map());
    const UNDO_DELAY = 5000;

    // Cancel all pending actions on unmount
    useEffect(() => {
        return () => { pendingActions.current.forEach(({ timer }) => clearTimeout(timer)); };
    }, []);

    // u4: Commit all pending undo actions when app goes to background
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (nextState === 'background' || nextState === 'inactive') {
                pendingActions.current.forEach(({ timer, commit }, taskId) => {
                    clearTimeout(timer);
                    pendingActions.current.delete(taskId);
                    commit().catch(() => undefined);
                });
            }
        });
        return () => subscription.remove();
    }, []);

    // FAB entrance animation
    const fabScale = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(fabScale, { toValue: 1, damping: 14, stiffness: 200, delay: 300, useNativeDriver: true }).start();
    }, []);

    // Screen enter transition — fires once on mount only
    const screenOpacity = useRef(new Animated.Value(0)).current;
    const screenTranslateY = useRef(new Animated.Value(16)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(screenOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
            Animated.spring(screenTranslateY, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }),
        ]).start();
    }, []);

    // HUD number pop scales
    const streakPopScale = useRef(new Animated.Value(1)).current;
    const boostPopScale = useRef(new Animated.Value(1)).current;
    const integrityPopScale = useRef(new Animated.Value(1)).current;
    const prevStreak = useRef<number | null>(null);
    const prevBoost = useRef<number>(0);
    const prevPoints = useRef<number>(0);

    // Real-time effective streak: base streak + today's contribution
    const effectiveStreak = (userState?.streak ?? 0) + (closedTodayCount > 0 ? 1 : 0);

    useEffect(() => {
        const pop = (anim: Animated.Value) =>
            Animated.sequence([
                Animated.spring(anim, { toValue: 1.35, damping: 6, stiffness: 500, useNativeDriver: true }),
                Animated.spring(anim, { toValue: 1, damping: 10, stiffness: 300, useNativeDriver: true }),
            ]).start();
        if (userState) {
            if (prevStreak.current !== null && effectiveStreak !== prevStreak.current) pop(streakPopScale);
            if (userState.boostTokens > prevBoost.current) pop(boostPopScale);
            if (userState.integrityPoints > prevPoints.current) pop(integrityPopScale);
            prevStreak.current = effectiveStreak;
            prevBoost.current = userState.boostTokens;
            prevPoints.current = userState.integrityPoints;
        }
    }, [effectiveStreak, userState?.boostTokens, userState?.integrityPoints]);

    // Search bar focus animation
    const searchFocusAnim = useRef(new Animated.Value(0)).current;
    const onSearchFocus = () => Animated.timing(searchFocusAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
    const onSearchBlur = () => Animated.timing(searchFocusAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

    // Web pull-to-refresh
    const scrollOffsetY = useRef(0);
    const pullAnim = useRef(new Animated.Value(0)).current;
    const rootRef = useRef<View>(null);
    const onRefreshRef = useRef<() => void>(() => {});

    // ─── Data Load ────────────────────────────────────────

    const loadData = useCallback(async () => {
        try {
        const tags = await TagService.getAllTags();
        setAllTags(tags);

        // Clear stale tag filter if the tag was deleted elsewhere
        setFilterTagId((prev) => {
            if (prev && !tags.some((t) => t.id === prev)) return null;
            return prev;
        });

        // processDays → markOverdueTasks updates statuses in storage,
        // so we must read tasks AFTER it runs.
        const autoDeclined = await checkAutoDeclineBoost();
        const processResult = await processDays();
        const [updatedState, records] = await Promise.all([
            getUserState(),
            getAllDailyRecords(),
        ]);
        setUserState(updatedState);
        setDailyRecords(records);

        // Celebrate streak milestones (7 / 30 / 90 days)
        if (processResult.milestone) {
            setMilestoneModalValue(processResult.milestone);
            setMilestoneModalVisible(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        }

        // Show boost offer if user missed a day and has tokens available
        if (updatedState.pendingBoostOffer && !autoDeclined) {
            setBoostOfferVisible(true);
        }

        const [allTasks, closedToday] = await Promise.all([
            TaskService.getAllTasks(),
            TaskService.getClosedTodayTasks(),
        ]);
        setClosedTodayCount(closedToday.length);

        // Home is execution-focused: only active tasks.
        const activeTasks = allTasks.filter((t) => t.status === 'open' || t.status === 'overdue');

        setTasks(activeTasks);

        // Update app icon badge with overdue count
        const overdueCount = activeTasks.filter((t) => t.status === 'overdue').length;
        setBadgeCount(overdueCount).catch(() => undefined);

        // Keep midday notification in sync with actual open task count
        refreshDailyNotifications().catch(() => undefined);

        } finally {
            setIsLoading(false);
        }
    }, [showToast]);

    const deferAction = useCallback((
        task: Task,
        message: string,
        icon: string,
        commit: () => Promise<void>,
    ) => {
        // Cancel any existing pending action for this task
        const existing = pendingActions.current.get(task.id);
        if (existing) { clearTimeout(existing.timer); pendingActions.current.delete(task.id); }

        // Optimistically remove from UI
        setTasks((prev) => prev.filter((t) => t.id !== task.id));

        const timer = setTimeout(async () => {
            pendingActions.current.delete(task.id);
            await commit();
            syncInBackground();
        }, UNDO_DELAY);

        pendingActions.current.set(task.id, {
            timer,
            commit,
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

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData, lastSyncAt])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await triggerSync();
            await loadData();
        } finally {
            setRefreshing(false);
        }
    }, [triggerSync, loadData]);

    // Keep ref in sync for stable DOM event callbacks
    onRefreshRef.current = onRefresh;

    const handleScroll = useCallback((e: any) => {
        scrollOffsetY.current = e.nativeEvent.contentOffset.y;
    }, []);

    // Web pull-to-refresh via native DOM events
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const node = rootRef.current as unknown as HTMLElement;
        if (!node?.addEventListener) return;

        let pullAccum = 0;
        let touchStartY = 0;
        let pulling = false;
        let wheelTimer: ReturnType<typeof setTimeout> | null = null;

        const releasePull = () => {
            if (pullAccum >= 50) {
                onRefreshRef.current();
            }
            pullAccum = 0;
            Animated.spring(pullAnim, { toValue: 0, useNativeDriver: false }).start();
        };

        // Desktop: mouse wheel
        const onWheel = (e: WheelEvent) => {
            if (scrollOffsetY.current > 1) return;
            if (e.deltaY < 0) {
                e.preventDefault();
                pullAccum = Math.min(pullAccum + Math.abs(e.deltaY) * 0.3, 80);
                pullAnim.setValue(pullAccum);
                if (wheelTimer) clearTimeout(wheelTimer);
                wheelTimer = setTimeout(releasePull, 400);
            }
        };

        // Mobile web: touch
        const onTouchStart = (e: TouchEvent) => {
            if (scrollOffsetY.current <= 1) {
                touchStartY = e.touches[0].clientY;
                pulling = true;
            }
        };
        const onTouchMove = (e: TouchEvent) => {
            if (!pulling) return;
            const dy = e.touches[0].clientY - touchStartY;
            if (dy > 0 && scrollOffsetY.current <= 1) {
                pullAccum = Math.min(dy * 0.4, 80);
                pullAnim.setValue(pullAccum);
            } else {
                pulling = false;
                pullAccum = 0;
                pullAnim.setValue(0);
            }
        };
        const onTouchEnd = () => {
            if (!pulling) return;
            pulling = false;
            releasePull();
        };

        node.addEventListener('wheel', onWheel, { passive: false });
        node.addEventListener('touchstart', onTouchStart, { passive: true });
        node.addEventListener('touchmove', onTouchMove, { passive: false });
        node.addEventListener('touchend', onTouchEnd);
        return () => {
            node.removeEventListener('wheel', onWheel);
            node.removeEventListener('touchstart', onTouchStart);
            node.removeEventListener('touchmove', onTouchMove);
            node.removeEventListener('touchend', onTouchEnd);
            if (wheelTimer) clearTimeout(wheelTimer);
        };
    }, [pullAnim]);

    // Animate pull indicator during refresh
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (refreshing || isSyncing) {
            Animated.timing(pullAnim, { toValue: 40, duration: 200, useNativeDriver: false }).start();
        } else {
            Animated.timing(pullAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        }
    }, [refreshing, isSyncing, pullAnim]);

    // ─── Sections ─────────────────────────────────────────

    const filteredTasks = useMemo(() => {
        let list = filterTagId ? tasks.filter((t) => t.tags?.includes(filterTagId)) : [...tasks];

        // Search filter
        const q = searchQuery.trim().toLowerCase();
        if (q.length > 0) {
            list = list.filter((t) =>
                t.title.toLowerCase().includes(q) ||
                (t.description && t.description.toLowerCase().includes(q))
            );
        }

        list.sort((a, b) => {
            // Overdue always floats to top regardless of sort mode
            if (a.status === 'overdue' && b.status !== 'overdue') return -1;
            if (b.status === 'overdue' && a.status !== 'overdue') return 1;

            switch (sortMode) {
                case 'newest':
                    return (b.createdAt ?? '') > (a.createdAt ?? '') ? 1 : -1;
                case 'alpha':
                    return (a.title ?? '').localeCompare(b.title ?? '');
                case 'default':
                default: {
                    const dateDiff = (a.dueDate || '') > (b.dueDate || '') ? 1 : (a.dueDate || '') < (b.dueDate || '') ? -1 : 0;
                    if (dateDiff !== 0) return dateDiff;
                    // Respect manual drag order within same date
                    if (a.manualOrder !== undefined && b.manualOrder !== undefined) {
                        return a.manualOrder - b.manualOrder;
                    }
                    // Fall back to priority
                    const pa = a.priority ? PRIORITY_ORDER[a.priority] : 3;
                    const pb = b.priority ? PRIORITY_ORDER[b.priority] : 3;
                    return pa - pb;
                }
            }
        });

        return list;
    }, [tasks, filterTagId, sortMode, searchQuery]);

    const sections = useMemo(() => {
        const today = localDateStr();

        const overdue = filteredTasks.filter(t => t.status === 'overdue');
        const todayTasks = filteredTasks.filter(t => t.status === 'open' && t.dueDate === today);
        const upNext = filteredTasks.filter(t => t.status === 'open' && t.dueDate && t.dueDate > today);
        const someday = filteredTasks.filter(t => t.status === 'open' && !t.dueDate);

        const s: TaskSection[] = [];
        if (overdue.length > 0) s.push({ key: 'overdue', title: 'Overdue', icon: 'alert-circle', data: overdue, accent: colors.danger });
        if (todayTasks.length > 0) s.push({ key: 'today', title: 'Due Today', icon: 'calendar', data: todayTasks, accent: colors.primary });
        if (upNext.length > 0) s.push({ key: 'up_next', title: 'Up Next', icon: 'arrow-forward', data: upNext, accent: colors.textSecondary });
        if (someday.length > 0) s.push({ key: 'someday', title: 'Someday', icon: 'partly-sunny-outline', data: someday, accent: colors.textMuted });

        return s;
    }, [filteredTasks, colors]);

    // ─── Animated section header ────────────────────────

    const AnimatedSectionHeader = useCallback(({ section }: { section: TaskSection }) => {
        const fadeIn = useRef(new Animated.Value(0)).current;
        const slideIn = useRef(new Animated.Value(-8)).current;

        useEffect(() => {
            Animated.parallel([
                Animated.timing(fadeIn, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.timing(slideIn, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start();
        }, []);

        return (
            <Animated.View style={[styles.sectionHeader, { backgroundColor: colors.background, opacity: fadeIn, transform: [{ translateY: slideIn }] }]}>
                <Ionicons name={section.icon as any} size={15} color={section.accent} />
                <Text style={[styles.sectionTitle, { color: section.accent }]}>{section.title}</Text>
                <Badge count={section.data.length} color={section.accent!} style={{ marginLeft: 'auto' }} />
            </Animated.View>
        );
    }, [colors]);

    // ─── Actions ──────────────────────────────────────────

    const openAddModal = () => setAddSheetVisible(true);

    const openViewModal = (task: Task) => {
        setTaskModalTask(task);
        setTaskModalVisible(true);
    };

    const closeTaskModal = () => {
        setTaskModalVisible(false);
        setTaskModalTask(null);
    };

    const handleAddTask = async (text: string, dueDate: string, tags: string[], options?: { description?: string; recurrence?: import('../types').RecurrenceType; priority?: import('../types').TaskPriority; reminderTime?: string }) => {
        try {
            const task = await TaskService.createTask(text, dueDate, tags, options);
            // Schedule task-specific reminder if set
            if (options?.reminderTime && task.dueDate) {
                const notifId = await scheduleTaskReminder(task.id, task.title, task.dueDate, options.reminderTime);
                if (notifId) await TaskService.updateTaskReminder(task.id, options.reminderTime, notifId);
            }
            closeTaskModal();
            loadData();
            syncInBackground();
            showToast('Task created', 'success', '✨');
        } catch (e) {
            console.error('[HomeScreen] Failed to create task:', e);
            showToast('Failed to save task', 'error', '⚠');
        }
    };

    const handleTaskAction = (task: Task) => {
        if (task.status === 'closed') {
            deferAction(task, 'Marked as open', '↺', async () => {
                await TaskService.uncompleteTask(task.id);
                await penalizeUncompletion(task.id);
                await unrecordClosure();
                await loadData();
            });
            return;
        }

        const closeType = TaskService.getCloseType(task);
        const closePts = closeType === 'on_time'
            ? INTEGRITY_POINTS.CLOSE_ON_TIME
            : closeType === 'late'
                ? INTEGRITY_POINTS.CLOSE_LATE
                : INTEGRITY_POINTS.CLOSE_OVERDUE;
        deferAction(task, `Task closed  +${closePts} pts`, '✓', async () => {
            await TaskService.closeTask(task.id);
            const preState = await getUserState();
            const newState = await awardClosePoints(task, closeType);
            const tokensEarned = newState.boostTokens - preState.boostTokens;
            if (tokensEarned > 0) {
                showToast(
                    `Boost earned! ⚡ ${newState.boostTokens}/${BOOST_CONFIG.MAX_TOKENS} ready`,
                    'warning',
                    '⚡',
                );
            }
            const isFirstEver = !preState.firstClosureEver;
            await recordClosure();
            if (isFirstEver) {
                await saveUserState({ ...preState, firstClosureEver: true });
                setMilestoneModalValue(0);
                setMilestoneModalVisible(true);
            }
            // Trigger app review prompt at milestones (best-effort)
            const state = await getUserState();
            const allClosed = (await TaskService.getAllTasks()).filter(t => t.status === 'closed').length;
            maybeRequestReview(state.streak ?? 0, allClosed).catch(() => undefined);
            await loadData();
        });
    };

    const handleUseBoost = async () => {
        setBoostOfferVisible(false);
        await useBoost();
        await loadData();
        showToast('Boost used. Streak protected! 🔥', 'success', '⚡');
    };

    const handleDeclineBoost = async () => {
        setBoostOfferVisible(false);
        await declineBoost();
        await loadData();
    };

    const handleDelete = (task: Task) => {
        deferAction(task, 'Task deleted', '🗑', async () => {
            await TaskService.deleteTask(task.id);
            await loadData();
        });
    };

    const handleSectionReorder = useCallback(async (reorderedTasks: Task[]) => {
        await Promise.all(
            reorderedTasks.map((task, idx) => TaskService.updateTaskManualOrder(task.id, idx))
        );
        // Update local state immediately without a full reload
        setTasks(prev => {
            const updated = [...prev];
            reorderedTasks.forEach((reordered, idx) => {
                const i = updated.findIndex(t => t.id === reordered.id);
                if (i !== -1) updated[i] = { ...updated[i], manualOrder: idx };
            });
            return updated;
        });
        syncInBackground();
    }, []);

    // ─── Render ───────────────────────────────────────────

    const renderHeader = () => (
        <View style={[styles.header, { paddingTop: insets.top + layout.screenTopGap }]}>
            {/* Web pull-to-refresh indicator */}
            {Platform.OS === 'web' && (
                <Animated.View
                    style={[
                        styles.webRefreshBar,
                        {
                            height: pullAnim,
                            opacity: pullAnim.interpolate({ inputRange: [0, 20], outputRange: [0, 1], extrapolate: 'clamp' }),
                        },
                    ]}
                >
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={[styles.webRefreshText, { color: colors.textMuted }]}>
                        {refreshing || isSyncing ? 'Syncing...' : 'Release to refresh'}
                    </Text>
                </Animated.View>
            )}
            {/* Top row: avatar + game HUD chips */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
                    <View style={[styles.avatarRing, { backgroundColor: colors.surfaceElevated }]}>
                        {user?.user_metadata?.avatar_url ? (
                            <Image source={{ uri: user.user_metadata.avatar_url }} style={styles.avatarImg} />
                        ) : (
                            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                                {user?.email?.[0].toUpperCase() || 'R'}
                            </Text>
                        )}
                    </View>
                </TouchableOpacity>

                <View style={styles.chipRow}>
                    <Animated.View style={{ transform: [{ scale: streakPopScale }] }}>
                        <Chip
                            color={
                                userState?.pendingBoostOffer
                                    ? colors.boost
                                    : userState?.streakGraceDate
                                        ? colors.warning ?? '#E5A645'
                                        : colors.streak
                            }
                            icon={userState?.pendingBoostOffer ? 'shield-checkmark' : 'flame'}
                            value={effectiveStreak}
                            size="sm"
                            onPress={() => showInfo(INFO_CONTENT.streak, <StreakTimeline streak={effectiveStreak} records={dailyRecords} />)}
                        />
                    </Animated.View>
                    {(userState?.boostTokens ?? 0) > 0 && (
                        <Animated.View style={{ transform: [{ scale: boostPopScale }] }}>
                            <Chip color={colors.boost} icon="flash" value={userState!.boostTokens} size="sm" onPress={() => userState?.pendingBoostOffer ? setBoostOfferVisible(true) : showInfo(INFO_CONTENT.boost, <BoostTokens tokens={userState!.boostTokens} />)} />
                        </Animated.View>
                    )}
                </View>
            </View>

            {/* Greeting */}
            <View style={styles.greetingBlock}>
                <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>
                    {getGreeting()}
                </Text>
                <Text style={[styles.screenSubtitle, { color: colors.textMuted }]}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
            </View>

            {/* Offline / sync status */}
            <OfflineBanner />

            {/* Compact focus line */}
            <View style={styles.focusLine}>
                <Text style={[styles.focusLineText, { color: colors.textSecondary }]}>
                    {tasks.length === 0
                        ? 'All clear'
                        : `${tasks.length} task${tasks.length !== 1 ? 's' : ''} open`}
                    {effectiveStreak > 0 ? `  ·  Day ${effectiveStreak} 🔥` : ''}
                    {userState?.streakGraceDate ? '  (grace)' : ''}
                </Text>
                {(userState?.integrityPoints ?? 0) > 0 && (
                    <TouchableOpacity onPress={() => showInfo(INFO_CONTENT.integrity)} hitSlop={8} style={styles.integrityRow}>
                        <Svg width={18} height={18}>
                            <Circle cx={9} cy={9} r={7} stroke={colors.border} strokeWidth={2} fill="none" />
                            <Circle
                                cx={9} cy={9} r={7}
                                stroke={colors.primary}
                                strokeWidth={2}
                                fill="none"
                                strokeDasharray={2 * Math.PI * 7}
                                strokeDashoffset={2 * Math.PI * 7 * (1 - (userState!.integrityPoints / BOOST_CONFIG.THRESHOLD))}
                                strokeLinecap="round"
                                rotation={-90}
                                origin="9, 9"
                            />
                        </Svg>
                        <Text style={[styles.focusLineSub, { color: colors.textMuted }]}>
                            {userState!.integrityPoints}/{BOOST_CONFIG.THRESHOLD} integrity
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

                {/* Search bar */}
                <Animated.View style={[styles.searchBar, { backgroundColor: colors.inputBackground, borderColor: searchFocusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.inputBorder, colors.primary] }) }]}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                        placeholder="Search tasks..."
                        placeholderTextColor={colors.placeholder}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        clearButtonMode="while-editing"
                        autoCorrect={false}
                        autoCapitalize="none"
                        spellCheck={false}
                        onFocus={onSearchFocus}
                        onBlur={onSearchBlur}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                    )}
                </Animated.View>

                {/* Sort + Tag filter */}
                <View style={styles.filterRow}>
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
                    <TouchableOpacity
                        style={[styles.sortBtn, { backgroundColor: sortMode !== 'default' ? colors.primary + '20' : colors.overlayLight }]}
                        onPress={() => setSortSheetVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="options-outline"
                            size={14}
                            color={sortMode !== 'default' ? colors.primary : colors.textSecondary}
                        />
                        <Text style={[styles.sortLabel, { color: sortMode !== 'default' ? colors.primary : colors.textSecondary }]}>
                            {sortMode === 'alpha' ? 'A–Z' : sortMode === 'newest' ? 'Newest' : 'Sort'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* First-time gesture education */}
            <View style={{ paddingHorizontal: layout.screenPaddingX }}>
                <GestureHint enabled={tasks.length > 0} />
            </View>
        </View>
    );

    return (
        <View ref={rootRef} style={[styles.root, { backgroundColor: colors.background }]}>
            {/* Screen enter wrapper */}
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.primaryMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.accentMuted }]} />
            </View>
            <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
            <ScrollView
                contentContainerStyle={[styles.listContent, { paddingBottom: 130 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                onScroll={handleScroll}
                scrollEventThrottle={16}
                refreshControl={
                    Platform.OS !== 'web'
                        ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                        : undefined
                }
            >
                {renderHeader()}
                {sections.length === 0 ? (
                    isLoading ? (
                        <TaskListSkeleton count={4} />
                    ) : searchQuery.trim().length > 0 ? (
                        <EmptyState
                            icon="search-outline"
                            title={`No results for "${searchQuery.trim()}"`}
                            message="Try a different keyword or check your spelling."
                            action={
                                <TouchableOpacity
                                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => setSearchQuery('')}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.emptyActionText, { color: colors.primaryContrast }]}>Clear Search</Text>
                                </TouchableOpacity>
                            }
                        />
                    ) : filterTagId ? (
                        <EmptyState
                            icon="pricetag-outline"
                            title="No tasks with this tag"
                            message="Try a different tag or clear the filter."
                            action={
                                <TouchableOpacity
                                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => setFilterTagId(null)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.emptyActionText, { color: colors.primaryContrast }]}>Clear Filter</Text>
                                </TouchableOpacity>
                            }
                        />
                    ) : effectiveStreak === 0 && userState?.streak === null ? (
                        <EmptyState
                            icon="flag-outline"
                            title="Welcome to Ravyn"
                            message="Add your first task and close it today to start your streak."
                            action={
                                <TouchableOpacity
                                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => openAddModal()}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={18} color={colors.primaryContrast} />
                                    <Text style={[styles.emptyActionText, { color: colors.primaryContrast }]}>Add First Task</Text>
                                </TouchableOpacity>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon="sparkles-outline"
                            title={
                                effectiveStreak >= 7
                                    ? `🔥 Day ${effectiveStreak} — you're on fire.`
                                    : effectiveStreak >= 1
                                        ? `Day ${effectiveStreak} clean.`
                                        : "You're clear for now"
                            }
                            message={
                                effectiveStreak >= 1
                                    ? 'No open tasks. Add one for tomorrow to keep the streak alive.'
                                    : 'Add one commitment to keep momentum alive.'
                            }
                            action={
                                <TouchableOpacity
                                    style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                                    onPress={() => openAddModal()}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="add" size={18} color={colors.primaryContrast} />
                                    <Text style={[styles.emptyActionText, { color: colors.primaryContrast }]}>Add Task</Text>
                                </TouchableOpacity>
                            }
                        />
                    )
                ) : (
                    sections.map((section) => (
                        <View key={section.key}>
                            <AnimatedSectionHeader section={section} />
                            <DraggableList
                                data={section.data}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item, index, drag, isActive }: DragParams<Task>) => (
                                    <View style={{ paddingHorizontal: layout.screenPaddingX, marginBottom: spacing.sm }}>
                                        <TaskCard
                                            task={item}
                                            allTags={allTags}
                                            index={index}
                                            onClose={handleTaskAction}
                                            onUncomplete={handleTaskAction}
                                            onPress={(t) => openViewModal(t)}
                                            onDelete={handleDelete}
                                            onLongPress={() => drag()}
                                        />
                                    </View>
                                )}
                                onDragEnd={handleSectionReorder}
                            />
                        </View>
                    ))
                )}
            </ScrollView>

            {/* FAB */}
            <Animated.View style={{ position: 'absolute', right: 20, bottom: tabBarHeight + 20, transform: [{ scale: fabScale }] }}>
                <PressableScale
                    onPress={() => openAddModal()}
                    scaleTo={0.91}
                    style={[styles.fab, { backgroundColor: colors.primary }, shadows.lg]}
                    pressStyle={{ borderRadius: 99 }}
                >
                    <Ionicons name="add" size={26} color={colors.primaryContrast} />
                </PressableScale>
            </Animated.View>
            </Animated.View>


            <AddTaskSheet
                visible={addSheetVisible}
                onClose={() => setAddSheetVisible(false)}
                onSubmit={handleAddTask}
            />

            <TaskModal
                visible={taskModalVisible}
                mode="view"
                task={taskModalTask}
                allTags={allTags}
                onClose={closeTaskModal}
                onSaveEdit={async (t, changes) => {
                    const applyToOne = async () => {
                        if (changes.title) await TaskService.updateTaskTitle(t.id, changes.title);
                        if (changes.description !== undefined) await TaskService.updateTaskDescription(t.id, changes.description);
                        if (changes.tags) await TaskService.updateTaskTags(t.id, changes.tags);
                        if (changes.recurrence !== undefined) await TaskService.updateTaskRecurrence(t.id, changes.recurrence);
                        if (changes.priority !== undefined) await TaskService.updateTaskPriority(t.id, changes.priority ?? undefined);
                        if (changes.reminderTime !== undefined) {
                            if (t.reminderNotificationId) {
                                const { cancelTaskReminder } = await import('../services/notificationService');
                                await cancelTaskReminder(t.reminderNotificationId);
                            }
                            const newTime = changes.reminderTime ?? undefined;
                            let newNotifId: string | undefined;
                            if (newTime && t.dueDate) {
                                const id = await scheduleTaskReminder(t.id, t.title, t.dueDate, newTime);
                                newNotifId = id ?? undefined;
                            }
                            await TaskService.updateTaskReminder(t.id, newTime, newNotifId);
                        }
                    };
                    const finish = () => { closeTaskModal(); loadData(); syncInBackground(); showToast('Task updated', 'success', '✓'); };

                    // u5: If recurring task and text/priority fields changed, offer series edit
                    const hasSeriesChanges = changes.title || changes.description !== undefined || changes.priority !== undefined || changes.reminderTime !== undefined;
                    if (t.recurrence && hasSeriesChanges) {
                        if (Platform.OS === 'web') {
                            const all = window.confirm('Apply changes to all future occurrences?\n\nCancel = this task only.');
                            if (all) await TaskService.updateRecurringSeries(t.id, changes);
                            else await applyToOne();
                            finish();
                        } else {
                            Alert.alert(
                                'Edit recurring task',
                                'Apply changes to this task only, or all future occurrences?',
                                [
                                    { text: 'This task', onPress: async () => { await applyToOne(); finish(); } },
                                    { text: 'All future', style: 'default', onPress: async () => { await TaskService.updateRecurringSeries(t.id, changes); finish(); } },
                                    { text: 'Cancel', style: 'cancel' },
                                ],
                            );
                        }
                    } else {
                        await applyToOne();
                        finish();
                    }
                }}
                onToggleStatus={(t) => {
                    handleTaskAction(t);
                    closeTaskModal();
                }}
                onDelete={async (t) => {
                    await TaskService.deleteTask(t.id);
                    closeTaskModal();
                    loadData();
                    syncInBackground();
                }}
                onReschedule={async (t, date) => {
                    const count = await TaskService.getTodayRescheduleCount();
                    const doReschedule = async () => {
                        const result = await TaskService.rescheduleTask(t.id, date, count);
                        if (!result.success) {
                            showToast('Reschedule limit reached', 'warning', '⚠');
                            return;
                        }
                        loadData();
                        syncInBackground();
                        showToast('Rescheduled', 'info', '📅');
                    };
                    if (count >= RESCHEDULE_CONFIG.FREE_PER_DAY) {
                        setRescheduleConfirmFn(() => doReschedule);
                    } else {
                        doReschedule();
                    }
                }}
            />

            <InfoSheet
                visible={!!infoContent}
                content={infoContent}
                onClose={closeInfo}
                headerVisual={infoVisual}
            />

            <BoostOfferModal
                visible={boostOfferVisible}
                streak={effectiveStreak}
                boostTokens={userState?.boostTokens ?? 0}
                onUseBoost={handleUseBoost}
                onDecline={handleDeclineBoost}
            />

            <MilestoneModal
                visible={milestoneModalVisible}
                milestone={milestoneModalValue}
                onClose={() => setMilestoneModalVisible(false)}
            />

            {/* Sort sheet */}
            <Modal visible={sortSheetVisible} transparent animationType="fade" onRequestClose={() => setSortSheetVisible(false)}>
                <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSortSheetVisible(false)}>
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.overlay }]} />
                </Pressable>
                <View style={[styles.sortSheet, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={[styles.sortSheetHandle, { backgroundColor: colors.border }]} />
                    <Text style={[styles.sortSheetTitle, { color: colors.textPrimary }]}>Sort tasks</Text>
                    {([
                        { key: 'default', label: 'Due Date', sub: 'Overdue first, then by date', icon: 'calendar-outline' },
                        { key: 'newest', label: 'Newest First', sub: 'Most recently created', icon: 'time-outline' },
                        { key: 'alpha', label: 'Alphabetical', sub: 'A to Z', icon: 'text-outline' },
                    ] as const).map(({ key, label, sub, icon }) => (
                        <TouchableOpacity
                            key={key}
                            style={[styles.sortOption, sortMode === key && { backgroundColor: colors.primary + '14' }]}
                            onPress={() => { setSortMode(key); setSortSheetVisible(false); }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name={icon} size={18} color={sortMode === key ? colors.primary : colors.textSecondary} />
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sortOptionLabel, { color: sortMode === key ? colors.primary : colors.textPrimary }]}>{label}</Text>
                                <Text style={[styles.sortOptionSub, { color: colors.textMuted }]}>{sub}</Text>
                            </View>
                            {sortMode === key && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                        </TouchableOpacity>
                    ))}
                </View>
            </Modal>

            <ConfirmSheet
                visible={!!rescheduleConfirmFn}
                title="Integrity Penalty"
                message={`Rescheduling again today costs ${Math.abs(INTEGRITY_POINTS.RESCHEDULE_PENALTY)} integrity points.`}
                confirmLabel="Reschedule Anyway"
                cancelLabel="Cancel"
                onConfirm={() => { rescheduleConfirmFn?.(); setRescheduleConfirmFn(null); }}
                onCancel={() => setRescheduleConfirmFn(null)}
            />
            <KeyboardToolbar />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    listContent: {},

    // ── Backdrop orbs
    backdropLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    backdropOrbTop: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: borderRadius.full,
        top: -130,
        right: -100,
        opacity: 0.5,
    },
    backdropOrbBottom: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: borderRadius.full,
        bottom: -140,
        left: -80,
        opacity: 0.4,
    },

    // ── Web pull-to-refresh indicator
    webRefreshBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        overflow: 'hidden',
    },
    webRefreshText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // ── Header
    header: {
        paddingHorizontal: layout.screenPaddingX,
        paddingBottom: layout.sectionGap,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    avatarRing: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarLetter: { fontSize: 15, fontWeight: '700' },

    chipRow: { flexDirection: 'row', gap: layout.chipGap },
    chipScroll: { flexDirection: 'row', gap: layout.chipGap },

    // ── Greeting
    greetingBlock: { marginBottom: spacing.xl },
    screenTitle: {
        ...typography.h1,
    },
    screenSubtitle: {
        ...typography.bodyMedium,
        marginTop: spacing['2xs'],
    },

    // ── Focus line
    focusLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    focusLineText: {
        fontSize: 13,
        fontWeight: '500',
    },
    focusLineSub: {
        fontSize: 12,
        fontWeight: '500',
    },
    integrityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },

    // ── Card title
    cardTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md - spacing['2xs'],
        marginBottom: spacing.sm,
    },
    cardTitle: {
        ...typography.headlineSmall,
    },
    focusHint: {
        ...typography.bodySmall,
        marginBottom: spacing.md,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: spacing.md,
    },
    focusFooter: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    focusChips: {
        flexDirection: 'row',
        gap: spacing.xs,
        alignItems: 'center',
    },

    // ── Search bar
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? 10 : 6,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        paddingVertical: 0,
    },

    // ── Filter row (tags + sort)
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    tagFilterSection: {
        flex: 1,
        marginTop: spacing.md,
    },
    tagFilterRow: {
        flexDirection: 'row',
        gap: layout.chipGap,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing['2xs'],
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    sortLabel: {
        fontSize: 11,
        fontWeight: '600',
    },

    // ── Sort sheet
    sortSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: layout.sheetRadius,
        borderTopRightRadius: layout.sheetRadius,
        paddingHorizontal: layout.cardPadding,
        paddingBottom: spacing.xxxl,
        paddingTop: spacing.md,
        alignItems: 'center',
    },
    sortSheetHandle: {
        width: layout.sheetHandleWidth,
        height: layout.sheetHandleHeight,
        borderRadius: 2,
        marginBottom: spacing.lg,
    },
    sortSheetTitle: {
        ...typography.headlineSmall,
        marginBottom: spacing.md,
        alignSelf: 'flex-start',
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        width: '100%',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.xs,
    },
    sortOptionLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    sortOptionSub: {
        fontSize: 12,
        marginTop: spacing['2xs'],
    },

    // ── Sections
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: spacing.sm,
        marginTop: spacing.sm,
        gap: layout.sectionHeaderGap,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.1,
    },

    // ── Empty state CTA
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
    },
    emptyActionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // ── FAB
    fab: {
        width: layout.fabSize,
        height: layout.fabSize,
        borderRadius: layout.fabRadius,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
