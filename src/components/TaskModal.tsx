// Ravyn — Unified Task Modal
// Full-screen modal for adding, viewing, and editing tasks.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ScrollView,
    TextInput,
    Platform,
    Alert,
    KeyboardAvoidingView,
    Animated,
    LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Task, Tag, RecurrenceType, TaskPriority } from '../types';
import { useTheme } from '../theme/ThemeContext';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from './KeyboardToolbar';
import { spacing, borderRadius, typography, shadows } from '../theme';
import * as TagService from '../services/tagService';
import * as Haptics from 'expo-haptics';
import {
    format,
    parseISO,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    isBefore,
    startOfDay,
    addMonths,
} from 'date-fns';
import { Chip } from './ds';
import PressableScale from './PressableScale';
import { localDateStr, localTomorrowStr, localDaysFromNow } from '../utils/dateUtils';

// ─── Date helpers ─────────────────────────────────────

function todayStr(): string { return localDateStr(); }
function tomorrowStr(): string { return localTomorrowStr(); }
function daysFromNow(n: number): string { return localDaysFromNow(n); }

function formatDateLabel(dateStr: string): string {
    const today = todayStr();
    const tmrw = tomorrowStr();
    if (dateStr === today) return 'Today';
    if (dateStr === tmrw) return 'Tomorrow';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type DatePreset = 'today' | 'tomorrow' | 'week' | 'none';

// ─── Types ────────────────────────────────────────────

export type TaskModalMode = 'add' | 'view' | 'edit';

export interface TaskModalProps {
    visible: boolean;
    mode: TaskModalMode;
    task?: Task | null;
    allTags?: Tag[];
    onClose: () => void;
    onSubmitNew?: (title: string, dueDate: string, tags: string[], options?: { description?: string; recurrence?: RecurrenceType; priority?: TaskPriority; reminderTime?: string }) => void;
    onSaveEdit?: (task: Task, changes: { title?: string; description?: string; tags?: string[]; recurrence?: RecurrenceType; priority?: TaskPriority | null; reminderTime?: string | null }) => void;
    onToggleStatus?: (task: Task) => void;
    onDelete?: (task: Task) => void;
    onReschedule?: (task: Task, date: string) => void;
}

// ─── Recurrence labels ────────────────────────────────

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string; icon: string }[] = [
    { value: null, label: 'None', icon: 'close-circle-outline' },
    { value: 'daily', label: 'Daily', icon: 'today-outline' },
    { value: 'weekly', label: 'Weekly', icon: 'calendar-outline' },
    { value: 'monthly', label: 'Monthly', icon: 'calendar-number-outline' },
];

// ─── Component ────────────────────────────────────────

export default function TaskModal({
    visible,
    mode: initialMode,
    task,
    allTags = [],
    onClose,
    onSubmitNew,
    onSaveEdit,
    onToggleStatus,
    onDelete,
    onReschedule,
}: TaskModalProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    // ── Mode state (view can transition to edit)
    const [mode, setMode] = useState<TaskModalMode>(initialMode);

    // ── Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState(todayStr());
    const [activePreset, setActivePreset] = useState<DatePreset>('today');
    const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
    const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
    const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [localTags, setLocalTags] = useState<Tag[]>([]);
    const [showNewTag, setShowNewTag] = useState(false);
    const [newTagLabel, setNewTagLabel] = useState('');

    // ── Calendar state (for reschedule in edit mode)
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [pickedDate, setPickedDate] = useState<Date | null>(null);

    // ── Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    const titleRef = useRef<TextInput>(null);
    const descRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const sectionOffsets = useRef<Record<string, number>>({});

    const trackLayout = (key: string) => (e: LayoutChangeEvent) => {
        sectionOffsets.current[key] = e.nativeEvent.layout.y;
    };

    const scrollToSection = (key: string) => {
        const y = sectionOffsets.current[key];
        if (y !== undefined && scrollRef.current) {
            setTimeout(() => {
                scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
            }, 300);
        }
    };

    // ── Reset on open
    useEffect(() => {
        if (visible) {
            setMode(initialMode);
            TagService.getAllTags().then(setLocalTags);

            if (initialMode === 'add') {
                setTitle('');
                setDescription('');
                setDueDate(todayStr());
                setActivePreset('today');
                setRecurrence(null);
                setPriority(undefined);
                setReminderTime(undefined);
                setSelectedTagIds([]);
            } else if (task) {
                setTitle(task.title);
                setDescription(task.description ?? '');
                setDueDate(task.dueDate ?? todayStr());
                setActivePreset('none');
                setRecurrence(task.recurrence ?? null);
                setPriority(task.priority ?? undefined);
                setReminderTime(task.reminderTime ?? undefined);
                setSelectedTagIds(task.tags ?? []);
            }

            setShowNewTag(false);
            setNewTagLabel('');
            setShowCalendar(false);
            setPickedDate(null);
            setCalendarMonth(new Date());

            fadeAnim.setValue(0);
            slideAnim.setValue(50);
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
            ]).start();
        }
    }, [visible, initialMode, task]);

    // ── Derived
    const isEditable = mode === 'add' || mode === 'edit';
    const isClosed = task?.status === 'closed';
    const isOverdue = task?.status === 'overdue';
    const canSubmit = title.trim().length > 0;

    // ── Date preset handler
    const selectPreset = (preset: DatePreset) => {
        setActivePreset(preset);
        switch (preset) {
            case 'today': setDueDate(todayStr()); break;
            case 'tomorrow': setDueDate(tomorrowStr()); break;
            case 'week': setDueDate(daysFromNow(6)); break;
        }
    };

    // ── Tag toggle
    const toggleTag = (tagId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
        );
    };

    // ── Create new tag inline
    const handleCreateTag = async () => {
        const trimmed = newTagLabel.trim();
        if (!trimmed) return;
        try {
            const tag = await TagService.createTag(trimmed);
            setLocalTags((prev) => prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]);
            setSelectedTagIds((prev) => prev.includes(tag.id) ? prev : [...prev, tag.id]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        } catch { /* tag limit reached */ }
        setNewTagLabel('');
        setShowNewTag(false);
    };

    // ── Calendar
    const today = startOfDay(new Date());
    const goMonth = (dir: number) => setCalendarMonth((m) => addMonths(m, dir));
    const calendarCells = useMemo(() => {
        const start = startOfWeek(startOfMonth(calendarMonth));
        const end = endOfWeek(endOfMonth(calendarMonth));
        return eachDayOfInterval({ start, end }).map((date) => ({
            date,
            key: format(date, 'yyyy-MM-dd'),
            isCurrentMonth: date.getMonth() === calendarMonth.getMonth(),
        }));
    }, [calendarMonth]);

    const handleConfirmReschedule = () => {
        if (!pickedDate || !task) return;
        const dateStr = format(pickedDate, 'yyyy-MM-dd');
        onReschedule?.(task, dateStr);
        setShowCalendar(false);
        setPickedDate(null);
    };

    // ── Submit (add mode)
    const handleSubmitNew = () => {
        const trimmed = title.trim();
        if (!trimmed) return;
        onSubmitNew?.(trimmed, dueDate, selectedTagIds, {
            description: description.trim() || undefined,
            recurrence: recurrence ?? undefined,
            priority: priority ?? undefined,
            reminderTime: reminderTime ?? undefined,
        });
    };

    // ── Save (edit mode)
    const handleSaveEdit = () => {
        if (!task) return;
        const trimmed = title.trim();
        if (!trimmed) return;
        onSaveEdit?.(task, {
            title: trimmed !== task.title ? trimmed : undefined,
            description: description.trim() !== (task.description ?? '') ? description.trim() : undefined,
            tags: JSON.stringify(selectedTagIds) !== JSON.stringify(task.tags ?? []) ? selectedTagIds : undefined,
            recurrence: recurrence !== (task.recurrence ?? null) ? recurrence : undefined,
            priority: priority !== (task.priority ?? undefined) ? (priority ?? null) : undefined,
            reminderTime: reminderTime !== (task.reminderTime ?? undefined) ? (reminderTime ?? null) : undefined,
        });
    };

    // ── Delete
    const handleDelete = () => {
        if (!task) return;
        if (Platform.OS === 'web') {
            if (window.confirm('Delete this task permanently?')) {
                onDelete?.(task);
            }
        } else {
            Alert.alert('Delete Task', 'This action cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(task) },
            ]);
        }
    };

    // ── Close with animation
    const handleClose = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 50, duration: 200, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    if (!visible) return null;

    const tags = localTags.length > 0 ? localTags : allTags;

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            <Animated.View style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: fadeAnim }]} />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Animated.View
                    style={[
                        styles.modal,
                        {
                            backgroundColor: colors.background,
                            paddingTop: insets.top,
                            paddingBottom: insets.bottom,
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    {/* ── Header ── */}
                    <View style={[styles.header, { borderBottomColor: colors.divider }]}>
                        <TouchableOpacity onPress={handleClose} hitSlop={12} style={styles.headerBtn}>
                            <Ionicons name="close" size={22} color={colors.textPrimary} />
                        </TouchableOpacity>

                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                            {mode === 'add' ? 'New Task' : mode === 'edit' ? 'Edit Task' : 'Task Details'}
                        </Text>

                        {mode === 'view' && (
                            <TouchableOpacity onPress={() => setMode('edit')} hitSlop={12} style={styles.headerBtn}>
                                <Ionicons name="create-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        )}
                        {mode === 'edit' && (
                            <TouchableOpacity
                                onPress={handleSaveEdit}
                                hitSlop={12}
                                style={styles.headerBtn}
                                disabled={!canSubmit}
                            >
                                <Text style={[styles.headerAction, { color: canSubmit ? colors.primary : colors.textMuted }]}>Save</Text>
                            </TouchableOpacity>
                        )}
                        {mode === 'add' && (
                            <TouchableOpacity
                                onPress={handleSubmitNew}
                                hitSlop={12}
                                style={styles.headerBtn}
                                disabled={!canSubmit}
                            >
                                <Text style={[styles.headerAction, { color: canSubmit ? colors.primary : colors.textMuted }]}>Add</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* ── Content ── */}
                    <ScrollView
                        ref={scrollRef}
                        style={styles.body}
                        contentContainerStyle={styles.bodyContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Status chip (view/edit only) */}
                        {task && mode !== 'add' && (
                            <View style={styles.statusRow}>
                                <Chip
                                    color={isClosed ? colors.success : (isOverdue ? colors.danger : colors.primary)}
                                    label={isClosed ? 'COMPLETED' : (isOverdue ? 'OVERDUE' : 'OPEN')}
                                    variant="solid"
                                    size="sm"
                                />
                                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                                    Due {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No date'}
                                </Text>
                            </View>
                        )}

                        {/* ── Title ── */}
                        <View style={styles.section} onLayout={trackLayout('title')}>
                            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TITLE</Text>
                            {isEditable ? (
                                <TextInput
                                    ref={titleRef}
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: colors.inputBackground,
                                            borderColor: title.trim().length > 0 ? colors.primary : colors.inputBorder,
                                            color: colors.textPrimary,
                                        },
                                    ]}
                                    placeholder="What will you close?"
                                    placeholderTextColor={colors.placeholder}
                                    value={title}
                                    onChangeText={setTitle}
                                    maxLength={120}
                                    autoCapitalize="sentences"
                                    selectionColor={colors.primary}
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => descRef.current?.focus()}
                                    onFocus={() => scrollToSection('title')}
                                />
                            ) : (
                                <Text style={[styles.titleText, { color: colors.textPrimary }]}>{task?.title}</Text>
                            )}
                        </View>

                        {/* ── Description ── */}
                        <View style={styles.section} onLayout={trackLayout('desc')}>
                            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>NOTES</Text>
                            {isEditable ? (
                                <TextInput
                                    ref={descRef}
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    style={[
                                        styles.textArea,
                                        {
                                            backgroundColor: colors.inputBackground,
                                            borderColor: colors.inputBorder,
                                            color: colors.textPrimary,
                                        },
                                    ]}
                                    placeholder="Add context or details..."
                                    placeholderTextColor={colors.placeholder}
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                    maxLength={500}
                                    textAlignVertical="top"
                                    selectionColor={colors.primary}
                                    onFocus={() => scrollToSection('desc')}
                                />
                            ) : (
                                <Text style={[styles.descText, { color: description ? colors.textSecondary : colors.textMuted }]}>
                                    {description || 'No notes'}
                                </Text>
                            )}
                        </View>

                        {/* ── Due Date ── */}
                        {isEditable && (
                            <View style={styles.section}>
                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DUE DATE</Text>

                                {mode === 'add' && (
                                    <View style={styles.chipRow}>
                                        {([
                                            { key: 'today', label: 'Today', icon: 'flame' },
                                            { key: 'tomorrow', label: 'Tomorrow', icon: 'sunny-outline' },
                                            { key: 'week', label: 'This week', icon: 'calendar-outline' },
                                        ] as const).map(({ key, label, icon }) => {
                                            const isActive = activePreset === key;
                                            return (
                                                <PressableScale
                                                    key={key}
                                                    scaleTo={0.91}
                                                    style={[styles.chip, { backgroundColor: isActive ? colors.primary : colors.overlayLight }]}
                                                    onPress={() => selectPreset(key)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name={icon as any} size={13} color={isActive ? colors.primaryContrast : colors.textMuted} />
                                    <Text style={[styles.chipLabel, { color: isActive ? colors.primaryContrast : colors.textSecondary }]}>
                                                        {label}
                                                    </Text>
                                                </PressableScale>
                                            );
                                        })}
                                    </View>
                                )}

                                {mode === 'edit' && !isClosed && (
                                    <>
                                        <TouchableOpacity
                                            style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                            onPress={() => setShowCalendar((v) => !v)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                                            <Text style={[styles.fieldRowText, { color: colors.textPrimary }]}>
                                                {dueDate ? formatDateLabel(dueDate) : 'Pick a date'}
                                            </Text>
                                            <Ionicons
                                                name={showCalendar ? 'chevron-up' : 'chevron-down'}
                                                size={16}
                                                color={colors.textMuted}
                                                style={{ marginLeft: 'auto' }}
                                            />
                                        </TouchableOpacity>

                                        {showCalendar && (
                                            <View style={[styles.calendarBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                                <View style={styles.calMonthNav}>
                                                    <TouchableOpacity onPress={() => goMonth(-1)} hitSlop={12}>
                                                        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                    <Text style={[styles.calMonthTitle, { color: colors.textPrimary }]}>
                                                        {format(calendarMonth, 'MMMM yyyy')}
                                                    </Text>
                                                    <TouchableOpacity onPress={() => goMonth(1)} hitSlop={12}>
                                                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={styles.calWeekRow}>
                                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                        <Text key={`wd-${i}`} style={[styles.calWeekDay, { color: colors.textMuted }]}>{d}</Text>
                                                    ))}
                                                </View>

                                                <View style={styles.calGrid}>
                                                    {calendarCells.map((cell) => {
                                                        const isPast = isBefore(cell.date, today);
                                                        const isSelected = pickedDate ? isSameDay(cell.date, pickedDate) : false;
                                                        const isTodayCell = isSameDay(cell.date, today);
                                                        const disabled = isPast || !cell.isCurrentMonth;

                                                        return (
                                                            <TouchableOpacity
                                                                key={cell.key}
                                                                style={[
                                                                    styles.calDayCell,
                                                                    isSelected && { backgroundColor: colors.primary },
                                                                    isTodayCell && !isSelected && { backgroundColor: colors.primary + '14' },
                                                                ]}
                                                                onPress={() => !disabled && setPickedDate(cell.date)}
                                                                activeOpacity={disabled ? 1 : 0.6}
                                                            >
                                                                <Text style={[
                                                                    styles.calDayNum,
                                                                    {
                                                                        color: isSelected ? colors.primaryContrast
                                                                            : disabled ? colors.textMuted + '40'
                                                                                : isTodayCell ? colors.primary
                                                                                    : colors.textPrimary,
                                                                        fontWeight: isTodayCell || isSelected ? '700' : '400',
                                                                    },
                                                                ]}>
                                                                    {cell.date.getDate()}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    })}
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.calConfirm, { backgroundColor: pickedDate ? colors.primary : colors.surfacePressed }]}
                                                    onPress={handleConfirmReschedule}
                                                    disabled={!pickedDate}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={[styles.calConfirmText, { color: pickedDate ? colors.primaryContrast : colors.textMuted }]}>
                                                        {pickedDate ? `Reschedule to ${format(pickedDate, 'MMM d, yyyy')}` : 'Pick a date'}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </>
                                )}

                                {mode === 'add' && (
                                    <Text style={[styles.dateHint, { color: colors.textMuted }]}>
                                        {formatDateLabel(dueDate)}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* View mode: due date as text */}
                        {!isEditable && task && (
                            <View style={styles.section}>
                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>DUE DATE</Text>
                                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                                    {task.dueDate ? formatDateLabel(task.dueDate) : 'No date'}
                                </Text>
                            </View>
                        )}

                        {/* ── Recurrence ── */}
                        <View style={styles.section}>
                            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>REPEAT</Text>
                            {isEditable ? (
                                <View style={styles.chipRow}>
                                    {RECURRENCE_OPTIONS.map(({ value, label, icon }) => {
                                        const isActive = recurrence === value;
                                        return (
                                            <PressableScale
                                                key={label}
                                                scaleTo={0.91}
                                                style={[styles.chip, { backgroundColor: isActive ? colors.primary : colors.overlayLight }]}
                                                onPress={() => setRecurrence(value)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name={icon as any} size={13} color={isActive ? colors.primaryContrast : colors.textMuted} />
                                                <Text style={[styles.chipLabel, { color: isActive ? colors.primaryContrast : colors.textSecondary }]}>
                                                    {label}
                                                </Text>
                                            </PressableScale>
                                        );
                                    })}
                                </View>
                            ) : (
                                <Text style={[styles.descText, { color: recurrence ? colors.primary : colors.textMuted }]}>
                                    {recurrence ? `Repeats ${recurrence}` : 'Does not repeat'}
                                </Text>
                            )}
                        </View>

                        {/* ── Priority ── */}
                        <View style={styles.section}>
                            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>PRIORITY</Text>
                            {isEditable ? (
                                <View style={styles.chipRow}>
                                    {([undefined, 'high', 'medium', 'low'] as const).map((p) => {
                                        const isActive = priority === p;
                                        const cfg = p === undefined
                                            ? { label: 'None', color: colors.textMuted }
                                            : p === 'high' ? { label: '🔴 High', color: '#E06C75' }
                                            : p === 'medium' ? { label: '🟡 Mid', color: '#E5A645' }
                                            : { label: '🟢 Low', color: '#98C379' };
                                        return (
                                            <TouchableOpacity
                                                key={p ?? 'none'}
                                                style={[styles.chip, { backgroundColor: isActive ? (p ? cfg.color + '30' : colors.overlayLight) : colors.overlayLight, borderWidth: isActive ? 1.5 : 0, borderColor: isActive ? cfg.color : 'transparent' }]}
                                                onPress={() => { setPriority(p); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined); }}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipLabel, { color: isActive ? cfg.color : colors.textSecondary }]}>{cfg.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <Text style={[styles.descText, { color: priority ? (priority === 'high' ? '#E06C75' : priority === 'medium' ? '#E5A645' : '#98C379') : colors.textMuted }]}>
                                    {priority ? `${priority.charAt(0).toUpperCase() + priority.slice(1)} priority` : 'No priority set'}
                                </Text>
                            )}
                        </View>

                        {/* ── Reminder ── (view mode only; edit reminder via AddTaskSheet on creation) */}
                        {task?.reminderTime && !isEditable && (
                            <View style={styles.section}>
                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>REMINDER</Text>
                                <Text style={[styles.descText, { color: colors.primary }]}>⏰ {task.reminderTime}</Text>
                            </View>
                        )}

                        {/* ── Tags ── */}
                        <View style={styles.section} onLayout={trackLayout('tags')}>
                            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>TAGS</Text>
                            {isEditable ? (
                                <View style={styles.tagGrid}>
                                    {tags.map((tag) => {
                                        const isSelected = selectedTagIds.includes(tag.id);
                                        return (
                                            <TouchableOpacity
                                                key={tag.id}
                                                style={[
                                                    styles.tagChip,
                                                    {
                                                        backgroundColor: isSelected ? tag.color : tag.color + '18',
                                                        borderColor: tag.color,
                                                    },
                                                ]}
                                                onPress={() => toggleTag(tag.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.tagChipLabel, { color: isSelected ? '#FFF' : tag.color }]}>
                                                    {tag.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}

                                    {showNewTag ? (
                                        <View
                                            style={[styles.newTagInline, { borderColor: colors.inputBorder }]}
                                            onLayout={trackLayout('newTag')}
                                        >
                                            <TextInput
                                                style={[styles.newTagInput, { color: colors.textPrimary }]}
                                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                                placeholder="Tag name"
                                                placeholderTextColor={colors.placeholder}
                                                value={newTagLabel}
                                                onChangeText={setNewTagLabel}
                                                maxLength={24}
                                                autoCapitalize="words"
                                                onSubmitEditing={handleCreateTag}
                                                returnKeyType="done"
                                                selectionColor={colors.primary}
                                                onFocus={() => scrollToSection('newTag')}
                                                autoFocus
                                            />
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.tagChip, { backgroundColor: colors.overlayLight, borderColor: colors.border, borderStyle: 'dashed' }]}
                                            onPress={() => setShowNewTag(true)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="add" size={14} color={colors.textMuted} />
                                            <Text style={[styles.tagChipLabel, { color: colors.textMuted }]}>New</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                <View style={styles.tagGrid}>
                                    {selectedTagIds.length > 0 ? selectedTagIds.map((tagId) => {
                                        const tag = tags.find((t) => t.id === tagId);
                                        if (!tag) return null;
                                        return (
                                            <View key={tagId} style={[styles.tagChip, { backgroundColor: tag.color + '22', borderColor: tag.color }]}>
                                                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                                                <Text style={[styles.tagChipLabel, { color: tag.color }]}>{tag.label}</Text>
                                            </View>
                                        );
                                    }) : (
                                        <Text style={[styles.descText, { color: colors.textMuted }]}>No tags</Text>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* View mode: created date */}
                        {task && mode === 'view' && (
                            <View style={styles.section}>
                                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>CREATED</Text>
                                <Text style={[styles.descText, { color: colors.textSecondary }]}>
                                    {task.createdAt ? format(parseISO(task.createdAt), 'MMMM d, yyyy \u2022 h:mm a') : 'Unknown'}
                                </Text>
                            </View>
                        )}

                        {/* ── Actions (view mode) ── */}
                        {mode === 'view' && task && (
                            <View style={styles.actionsSection}>
                                <View style={[styles.actionDivider, { backgroundColor: colors.divider }]} />

                                <TouchableOpacity
                                    style={[styles.actionBtn, { backgroundColor: isClosed ? colors.surface : colors.primary, borderWidth: isClosed ? 1 : 0, borderColor: colors.border }]}
                                    onPress={() => { onToggleStatus?.(task); handleClose(); }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons
                                        name={isClosed ? 'arrow-undo-outline' : 'checkmark-circle-outline'}
                                        size={18}
                                        color={isClosed ? colors.textPrimary : colors.primaryContrast}
                                    />
                                    <Text style={[styles.actionBtnText, { color: isClosed ? colors.textPrimary : colors.primaryContrast }]}>
                                        {isClosed ? 'Mark as Open' : 'Complete Task'}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                    <Text style={[styles.deleteRowText, { color: colors.danger }]}>Delete Task</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ── Delete (edit mode) ── */}
                        {mode === 'edit' && task && (
                            <View style={styles.actionsSection}>
                                <View style={[styles.actionDivider, { backgroundColor: colors.divider }]} />
                                <TouchableOpacity style={styles.deleteRow} onPress={handleDelete}>
                                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                    <Text style={[styles.deleteRowText, { color: colors.danger }]}>Delete Task</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
            <KeyboardToolbar />
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        flex: 1,
    },
    modal: {
        flex: 1,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
    },
    headerBtn: {
        width: 44,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    headerAction: {
        fontSize: 15,
        fontWeight: '700',
    },
    headerViewActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerCompleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    headerCompleteBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Body
    body: {
        flex: 1,
    },
    bodyContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
    },

    // Sections
    section: {
        marginBottom: spacing.xl,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: spacing.sm,
    },

    // Inputs
    input: {
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: 14,
        fontSize: 16,
        fontWeight: '500',
        borderWidth: 1.5,
        lineHeight: 22,
    },
    textArea: {
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: 12,
        fontSize: 14,
        borderWidth: 1,
        lineHeight: 20,
        minHeight: 80,
        maxHeight: 160,
    },

    // Read-only text
    titleText: {
        ...typography.headlineMedium,
        fontSize: 22,
    },
    descText: {
        fontSize: 14,
        lineHeight: 20,
    },
    metaText: {
        fontSize: 12,
        fontWeight: '500',
    },
    dateHint: {
        fontSize: 12,
        marginTop: spacing.xs,
    },

    // Status row
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },

    // Chips
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: borderRadius.full,
        gap: 5,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Tags
    tagGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    tagChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        gap: 4,
    },
    tagChipLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    tagDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    newTagInline: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 2,
    },
    newTagInput: {
        fontSize: 12,
        fontWeight: '500',
        minWidth: 60,
        paddingVertical: 4,
    },

    // Field row (for reschedule trigger)
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    fieldRowText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Calendar
    calendarBox: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    calMonthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    calMonthTitle: {
        fontSize: 15,
        fontWeight: '600',
    },
    calWeekRow: {
        flexDirection: 'row',
        marginBottom: spacing.xs,
    },
    calWeekDay: {
        flex: 1,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '600',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calDayCell: {
        width: `${100 / 7}%`,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
    },
    calDayNum: {
        fontSize: 13,
    },
    calConfirm: {
        marginTop: spacing.sm,
        paddingVertical: 10,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
    },
    calConfirmText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Actions
    actionsSection: {
        marginTop: spacing.sm,
    },
    actionDivider: {
        height: 1,
        marginBottom: spacing.lg,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: 14,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    deleteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.md,
    },
    deleteRowText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
