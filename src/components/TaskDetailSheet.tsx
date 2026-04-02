// Ravyn — Task Detail Sheet
// Detailed view of a task with actions to Complete, Reschedule, or Delete.

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Pressable,
    Dimensions,
    Platform,
    Alert,
    ScrollView,
    TextInput,
    LayoutAnimation,
    UIManager,
    KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Task, Tag } from '../types';
import { useTheme } from '../theme/ThemeContext';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from './KeyboardToolbar';
import { spacing, borderRadius, typography, shadows, animations } from '../theme';
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

interface TaskDetailSheetProps {
    task: Task | null;
    visible: boolean;
    allTags?: Tag[];
    onClose: () => void;
    onToggleStatus: (task: Task) => void;
    onDelete: (task: Task) => void;
    onReschedule: (task: Task, date: string) => void;
    onTagsChange?: (task: Task, tagIds: string[]) => void;
    onDescriptionChange?: (task: Task, description: string) => void;
    onTitleChange?: (task: Task, title: string) => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function TaskDetailSheet({
    task,
    visible,
    allTags = [],
    onClose,
    onToggleStatus,
    onDelete,
    onReschedule,
    onTagsChange,
    onDescriptionChange,
    onTitleChange,
}: TaskDetailSheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const animatedDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
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
            if (translationY > 120 || velocityY > 500) {
                Animated.parallel([
                    Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
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

    const [isEditing, setIsEditing] = useState(false);
    const [editingTitle, setEditingTitle] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [pickedDate, setPickedDate] = useState<Date | null>(null);
    const [showTagPicker, setShowTagPicker] = useState(false);
    const [editingTags, setEditingTags] = useState<string[]>([]);
    const [editingDesc, setEditingDesc] = useState('');
    const [showNewTag, setShowNewTag] = useState(false);
    const [newTagLabel, setNewTagLabel] = useState('');
    const [localTags, setLocalTags] = useState<Tag[]>([]);

    useEffect(() => {
        if (visible) {
            setShowCalendar(false);
            setPickedDate(null);
            setCalendarMonth(new Date());
            setShowTagPicker(false);
            setShowNewTag(false);
            setNewTagLabel('');
            setIsEditing(false);
            setEditingTitle(task?.title ?? '');
            setEditingTags(task?.tags ?? []);
            setEditingDesc(task?.description ?? '');
            TagService.getAllTags().then(setLocalTags);

            slideAnim.setValue(SCREEN_HEIGHT);
            overlayAnim.setValue(0);
            const anim = Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    ...animations.spring,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        } else {
            const anim = Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(overlayAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]);
            anim.start();
            return () => { anim.stop(); };
        }
    }, [visible]);

    const calendarCells = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(calendarMonth);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
        return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((d) => ({
            date: d,
            key: format(d, 'yyyy-MM-dd'),
            isCurrentMonth: d.getMonth() === calendarMonth.getMonth(),
        }));
    }, [calendarMonth]);

    if (!task && !visible) return null;

    const isClosed = task?.status === 'closed';
    const isOverdue = task?.status === 'overdue';
    const today = startOfDay(new Date());

    const triggerLayout = () => LayoutAnimation.configureNext({
        duration: 220,
        create: { type: 'easeInEaseOut', property: 'opacity' },
        update: { type: 'spring', springDamping: 0.75 },
        delete: { type: 'easeInEaseOut', property: 'opacity' },
    });

    const goMonth = (dir: number) => setCalendarMonth((m) => addMonths(m, dir));

    const handleConfirmReschedule = () => {
        if (task && pickedDate) {
            onReschedule(task, format(pickedDate, 'yyyy-MM-dd'));
            onClose();
        }
    };

    const handleDelete = () => {
        if (Platform.OS === 'web') {
            if (confirm('Delete this task permanently?')) {
                if (task) onDelete(task);
                onClose();
            }
        } else {
            Alert.alert('Delete Task', 'Delete this task permanently?', [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        if (task) onDelete(task);
                        onClose();
                    }
                },
            ]);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <View style={styles.overlayContainer}>
                {/* Backdrop — visual only */}
                <Animated.View
                    style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: overlayAnim }]}
                    pointerEvents="none"
                />

                {/* Tappable area above sheet */}
                <Pressable style={{ flex: 1 }} onPress={animatedDismiss} />

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.surfaceElevated,
                            transform: [{ translateY: slideAnim }],
                            paddingBottom: spacing.xxl + 20 + insets.bottom,
                        }
                    ]}
                >
                    <PanGestureHandler
                        onGestureEvent={onHandleGesture}
                        onHandlerStateChange={onHandleStateChange}
                        activeOffsetY={10}
                        failOffsetX={[-20, 20]}
                    >
                        <Animated.View style={styles.handleContainer}>
                            <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        </Animated.View>
                    </PanGestureHandler>

                    {/* Content */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Header: Status & Due */}
                        <View style={styles.metaRow}>
                            <Chip
                                color={isClosed ? colors.success : (isOverdue ? colors.danger : colors.primary)}
                                label={isClosed ? 'COMPLETED' : (isOverdue ? 'OVERDUE' : 'OPEN')}
                                variant="solid"
                                size="sm"
                            />
                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                Due {task?.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'No Date'}
                            </Text>
                        </View>

                        {/* Title — read or edit */}
                        {isEditing ? (
                            <TextInput
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                style={[
                                    styles.titleInput,
                                    {
                                        backgroundColor: colors.inputBackground,
                                        borderColor: colors.inputBorder,
                                        color: colors.textPrimary,
                                    },
                                ]}
                                value={editingTitle}
                                onChangeText={setEditingTitle}
                                maxLength={120}
                                autoCapitalize="sentences"
                                selectionColor={colors.primary}
                            />
                        ) : (
                            <Text style={[styles.title, { color: colors.textPrimary }]}>
                                {task?.title}
                            </Text>
                        )}

                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                            Created {task?.createdAt ? format(parseISO(task.createdAt), 'MMMM d, h:mm a') : 'Unknown'}
                        </Text>

                        {/* Recurrence indicator */}
                        {task?.recurrence && (
                            <View style={[styles.recurrencePill, { backgroundColor: colors.primaryMuted }]}>
                                <Ionicons name="repeat" size={13} color={colors.primary} />
                                <Text style={[styles.recurrenceLabel, { color: colors.primary }]}>
                                    Repeats {task.recurrence}
                                </Text>
                            </View>
                        )}

                        {/* Description — read or edit */}
                        {isEditing ? (
                            <TextInput
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                style={[
                                    styles.descriptionInput,
                                    {
                                        backgroundColor: colors.inputBackground,
                                        borderColor: colors.inputBorder,
                                        color: colors.textPrimary,
                                    },
                                ]}
                                placeholder="Add notes..."
                                placeholderTextColor={colors.placeholder}
                                value={editingDesc}
                                onChangeText={setEditingDesc}
                                multiline
                                maxLength={500}
                                textAlignVertical="top"
                            />
                        ) : (
                            editingDesc ? (
                                <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
                                    {editingDesc}
                                </Text>
                            ) : null
                        )}

                        {/* Tags display (read mode) */}
                        {editingTags.length > 0 && !isEditing && (
                            <View style={styles.tagDisplayRow}>
                                {editingTags.map((tagId) => {
                                    const tag = (localTags.length > 0 ? localTags : allTags).find((t) => t.id === tagId);
                                    if (!tag) return null;
                                    return (
                                        <View key={tagId} style={[styles.tagPill, { backgroundColor: tag.color + '22' }]}>
                                            <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                                            <Text style={[styles.tagPillLabel, { color: tag.color }]}>{tag.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Divider */}
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Main Action (Toggle Status) — only in read mode */}
                        {!isEditing && (
                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    { backgroundColor: isClosed ? colors.surface : colors.primary, borderWidth: isClosed ? 1 : 0, borderColor: colors.border }
                                ]}
                                onPress={() => {
                                    if (task) onToggleStatus(task);
                                    onClose();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.primaryButtonText, { color: isClosed ? colors.textPrimary : colors.primaryContrast }]}>
                                    {isClosed ? 'Mark as Open' : 'Complete Task'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Edit Task button — read mode only */}
                        {!isEditing && (
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing.md }]}
                                onPress={() => { triggerLayout(); setIsEditing(true); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Edit Task</Text>
                            </TouchableOpacity>
                        )}

                        {/* Reschedule — edit mode only */}
                        {isEditing && !isClosed && (
                            <View style={{ marginBottom: spacing.md }}>
                                <TouchableOpacity
                                    style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                    onPress={() => { triggerLayout(); setShowCalendar((v) => !v); }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
                                    <Text style={[styles.actionText, { color: colors.textPrimary }]}>Reschedule</Text>
                                    <Ionicons
                                        name={showCalendar ? 'chevron-up' : 'chevron-down'}
                                        size={16}
                                        color={colors.textMuted}
                                        style={{ marginLeft: 'auto' }}
                                    />
                                </TouchableOpacity>

                                {showCalendar && (
                                    <View style={[styles.calendarBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        {/* Month nav */}
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

                                        {/* Weekday headers */}
                                        <View style={styles.calWeekRow}>
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                <Text key={`wd-${i}`} style={[styles.calWeekDay, { color: colors.textMuted }]}>{d}</Text>
                                            ))}
                                        </View>

                                        {/* Day grid */}
                                        <View style={styles.calGrid}>
                                            {calendarCells.map((cell) => {
                                                const isPast = isBefore(cell.date, today);
                                                const isSelected = pickedDate ? isSameDay(cell.date, pickedDate) : false;
                                                const isToday = isSameDay(cell.date, today);
                                                const disabled = isPast || !cell.isCurrentMonth;

                                                return (
                                                    <TouchableOpacity
                                                        key={cell.key}
                                                        style={[
                                                            styles.calDayCell,
                                                            isSelected && { backgroundColor: colors.primary },
                                                            isToday && !isSelected && { backgroundColor: colors.primary + '14' },
                                                        ]}
                                                        onPress={() => !disabled && setPickedDate(cell.date)}
                                                        activeOpacity={disabled ? 1 : 0.6}
                                                    >
                                                        <Text style={[
                                                            styles.calDayNum,
                                                            {
                                                                color: isSelected
                                                                    ? colors.primaryContrast
                                                                    : disabled
                                                                        ? colors.textMuted + '40'
                                                                        : isToday
                                                                            ? colors.primary
                                                                            : colors.textPrimary,
                                                                fontWeight: isToday || isSelected ? '700' : '400',
                                                            },
                                                        ]}>
                                                            {cell.date.getDate()}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Confirm button */}
                                        <TouchableOpacity
                                            style={[
                                                styles.calConfirm,
                                                { backgroundColor: pickedDate ? colors.primary : colors.surfacePressed },
                                            ]}
                                            onPress={handleConfirmReschedule}
                                            disabled={!pickedDate}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={[
                                                styles.calConfirmText,
                                                { color: pickedDate ? colors.primaryContrast : colors.textMuted },
                                            ]}>
                                                {pickedDate ? `Reschedule to ${format(pickedDate, 'MMM d, yyyy')}` : 'Pick a date'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Tags editor — edit mode only */}
                        {isEditing && (
                        <View style={{ marginBottom: spacing.md }}>
                            <TouchableOpacity
                                style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                onPress={() => { triggerLayout(); setShowTagPicker((v) => !v); }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="pricetag-outline" size={20} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Tags</Text>
                                <Ionicons
                                    name={showTagPicker ? 'chevron-up' : 'chevron-down'}
                                    size={16}
                                    color={colors.textMuted}
                                    style={{ marginLeft: 'auto' }}
                                />
                            </TouchableOpacity>

                            {showTagPicker && (
                                <View style={[styles.tagPickerBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                    <View style={styles.tagPickerGrid}>
                                        {localTags.map((tag) => {
                                            const isSelected = editingTags.includes(tag.id);
                                            return (
                                                <TouchableOpacity
                                                    key={tag.id}
                                                    style={[
                                                        styles.tagPickerChip,
                                                        {
                                                            backgroundColor: isSelected ? tag.color : tag.color + '18',
                                                            borderColor: tag.color,
                                                        },
                                                    ]}
                                                    onPress={() => {
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                                                        const next = isSelected
                                                            ? editingTags.filter((id) => id !== tag.id)
                                                            : [...editingTags, tag.id];
                                                        setEditingTags(next);
                                                        if (task && onTagsChange) onTagsChange(task, next);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.tagPickerLabel, { color: isSelected ? '#FFF' : tag.color }]}>
                                                        {tag.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}

                                        {showNewTag ? (
                                            <View style={[styles.newTagInline, { borderColor: colors.inputBorder }]}>
                                                <TextInput
                                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                                    style={[styles.newTagInput, { color: colors.textPrimary }]}
                                                    placeholder="Tag name"
                                                    placeholderTextColor={colors.placeholder}
                                                    value={newTagLabel}
                                                    onChangeText={setNewTagLabel}
                                                    maxLength={24}
                                                    onSubmitEditing={async () => {
                                                        const trimmed = newTagLabel.trim();
                                                        if (!trimmed) return;
                                                        try {
                                                            const tag = await TagService.createTag(trimmed);
                                                            setLocalTags((prev) => {
                                                                if (prev.some((t) => t.id === tag.id)) return prev;
                                                                return [...prev, tag];
                                                            });
                                                            const next = editingTags.includes(tag.id) ? editingTags : [...editingTags, tag.id];
                                                            setEditingTags(next);
                                                            if (task && onTagsChange) onTagsChange(task, next);
                                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
                                                        } catch {
                                                            // Tag limit reached
                                                        }
                                                        setNewTagLabel('');
                                                        setShowNewTag(false);
                                                    }}
                                                    returnKeyType="done"
                                                    autoFocus
                                                />
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[
                                                    styles.tagPickerChip,
                                                    { backgroundColor: colors.overlayLight, borderColor: colors.border, borderStyle: 'dashed' },
                                                ]}
                                                onPress={() => setShowNewTag(true)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="add" size={14} color={colors.textMuted} />
                                                <Text style={[styles.tagPickerLabel, { color: colors.textMuted }]}>New</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                        )}

                        {/* Save button — edit mode */}
                        {isEditing && (
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: colors.primary, marginBottom: spacing.md }]}
                                onPress={() => {
                                    if (task) {
                                        const trimmedTitle = editingTitle.trim();
                                        if (trimmedTitle && trimmedTitle !== task.title && onTitleChange) {
                                            onTitleChange(task, trimmedTitle);
                                        }
                                        const trimmedDesc = editingDesc.trim();
                                        if (trimmedDesc !== (task.description ?? '') && onDescriptionChange) {
                                            onDescriptionChange(task, trimmedDesc);
                                        }
                                    }
                                    setIsEditing(false);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>Save Changes</Text>
                            </TouchableOpacity>
                        )}

                        {/* Delete Action */}
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={handleDelete}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Task</Text>
                        </TouchableOpacity>

                    </ScrollView>
                    </KeyboardAvoidingView>
                    <KeyboardToolbar />
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
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
        maxHeight: SCREEN_HEIGHT * 0.85,
        ...shadows.lg,
    },
    handleContainer: {
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
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    title: {
        ...typography.headlineMedium,
        fontSize: 20,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodySmall,
        marginBottom: spacing.lg,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: spacing.lg,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        gap: spacing.sm,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Inline calendar
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
        textTransform: 'uppercase',
    },
    calGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calDayCell: {
        width: `${100 / 7}%` as any,
        aspectRatio: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.full,
    },
    calDayNum: {
        fontSize: 13,
    },
    calConfirm: {
        marginTop: spacing.sm,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    calConfirmText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Tag display
    tagDisplayRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: spacing.md,
    },
    tagPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        gap: 4,
    },
    tagColorDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    tagPillLabel: {
        fontSize: 11,
        fontWeight: '600',
    },

    // ── Tag picker
    tagPickerBox: {
        marginTop: spacing.sm,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    tagPickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagPickerChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: borderRadius.full,
        borderWidth: 1,
        gap: 4,
    },
    tagPickerLabel: {
        fontSize: 12,
        fontWeight: '600',
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

    titleInput: {
        ...typography.headlineMedium,
        fontSize: 20,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: spacing.md,
    },

    recurrencePill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: borderRadius.full,
        marginBottom: spacing.md,
    },
    recurrenceLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    descriptionInput: {
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 10,
        fontSize: 13,
        lineHeight: 18,
        borderWidth: 1,
        minHeight: 60,
        maxHeight: 120,
        marginBottom: spacing.md,
    },

    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: spacing.md,
    },
    deleteText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
