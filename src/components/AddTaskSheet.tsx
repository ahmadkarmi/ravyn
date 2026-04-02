// Ravyn — Add Task Sheet (full-screen modal)
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Animated, Dimensions, ScrollView, KeyboardAvoidingView, Platform, Keyboard, Alert, LayoutAnimation, UIManager } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, animations } from '../theme';
import { Tag, RecurrenceType, TaskPriority } from '../types';
import * as TagService from '../services/tagService';
import * as Haptics from 'expo-haptics';
import { localDateStr, localTomorrowStr, localDaysFromNow } from '../utils/dateUtils';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from './KeyboardToolbar';
import { format, addMonths, subMonths, isToday, isBefore, isSameDay, startOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

const { height: SH } = Dimensions.get('window');

const PRI: { value: TaskPriority | undefined; label: string; color: string | null }[] = [
    { value: undefined, label: 'None',   color: null },
    { value: 'high',    label: 'High',   color: '#E06C75' },
    { value: 'medium',  label: 'Medium', color: '#E5A645' },
    { value: 'low',     label: 'Low',    color: '#98C379' },
];
const REC: { value: RecurrenceType | null; label: string }[] = [
    { value: null, label: 'Never' }, { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' },
];
const WD = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function todayStr()    { return localDateStr(); }
function tomorrowStr() { return localTomorrowStr(); }
function fmtDate(s: string): string {
    if (s === todayStr())    return 'Today';
    if (s === tomorrowStr()) return 'Tomorrow';
    const [y,m,d] = s.split('-').map(Number);
    return format(new Date(y,m-1,d), 'EEE, MMM d');
}

interface AddTaskSheetProps {
    visible: boolean;
    onSubmit: (title: string, dueDate: string, tags: string[], options?: { description?: string; recurrence?: RecurrenceType; priority?: TaskPriority }) => void;
    onClose: () => void;
}

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function AddTaskSheet({ visible, onSubmit, onClose }: AddTaskSheetProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [title, setTitle]                   = useState('');
    const [dueDate, setDueDate]               = useState(todayStr());
    const [priority, setPriority]             = useState<TaskPriority | undefined>(undefined);
    const [description, setDescription]       = useState('');
    const [recurrence, setRecurrence]         = useState<RecurrenceType | null>(null);
    const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
    const [availableTags, setAvailableTags]   = useState<Tag[]>([]);
    const [newTagLabel, setNewTagLabel]       = useState('');
    const [showNewTag, setShowNewTag]         = useState(false);
    const [calMonth, setCalMonth]             = useState(new Date());
    const [pickedDate, setPickedDate]         = useState(new Date());
    const [openRow, setOpenRow]               = useState<string | null>(null);

    const slideAnim   = useRef(new Animated.Value(SH)).current;
    const overlayAnim = useRef(new Animated.Value(0)).current;
    const inputRef    = useRef<TextInput>(null);
    const scrollRef   = useRef<ScrollView>(null);
    const rowOffsets  = useRef<Record<string, number>>({});
    const onCloseRef  = useRef(onClose);
    onCloseRef.current = onClose;

    const scrollToRow = (row: string) => {
        setTimeout(() => {
            const y = rowOffsets.current[row];
            if (y !== undefined && scrollRef.current) {
                scrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
            }
        }, 260);
    };

    const calCells = useMemo(() => {
        const s = startOfWeek(startOfMonth(calMonth), { weekStartsOn: 1 });
        const e = endOfWeek(endOfMonth(calMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start: s, end: e }).map(date => ({
            date, key: format(date, 'yyyy-MM-dd'),
            inMonth: date.getMonth() === calMonth.getMonth(),
        }));
    }, [calMonth]);

    useEffect(() => {
        if (visible) {
            setTitle(''); setDueDate(todayStr()); setPriority(undefined);
            setDescription(''); setRecurrence(null); setSelectedTagIds([]);
            setNewTagLabel(''); setShowNewTag(false); setOpenRow(null);
            setCalMonth(new Date()); setPickedDate(new Date());
            slideAnim.setValue(SH); overlayAnim.setValue(0);
            const a = Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, ...animations.spring, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]);
            a.start(() => setTimeout(() => inputRef.current?.focus(), 60));
            TagService.getAllTags().then(setAvailableTags).catch(() => undefined);
            return () => { a.stop(); };
        } else {
            const a = Animated.parallel([
                Animated.timing(slideAnim,   { toValue: SH, duration: 250, useNativeDriver: true }),
                Animated.timing(overlayAnim, { toValue: 0,  duration: 250, useNativeDriver: true }),
            ]);
            a.start();
            return () => { a.stop(); };
        }
    }, [visible]);

    const hasChanges = useCallback(() => {
        return title.trim().length > 0 || description.trim().length > 0 || selectedTagIds.length > 0 || priority !== undefined || recurrence !== null || dueDate !== todayStr();
    }, [title, description, selectedTagIds, priority, recurrence, dueDate]);

    const onHandleGesture = (e: any) => {
        const dy = e.nativeEvent.translationY;
        if (dy > 0) { slideAnim.setValue(dy); overlayAnim.setValue(Math.max(0, 1 - dy / 400)); }
    };

    const dismiss = useCallback(() => {
        Animated.parallel([
            Animated.timing(slideAnim,   { toValue: SH, duration: 250, useNativeDriver: true }),
            Animated.timing(overlayAnim, { toValue: 0,  duration: 250, useNativeDriver: true }),
        ]).start(() => onCloseRef.current());
    }, []);

    const handleDismiss = useCallback(() => {
        if (hasChanges()) {
            Keyboard.dismiss();
            Alert.alert('Discard Task?', 'You have unsaved changes. Are you sure you want to discard them?', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: dismiss }
            ]);
        } else {
            dismiss();
        }
    }, [hasChanges, dismiss]);

    const onHandlerStateChange = (e: any) => {
        if (e.nativeEvent.oldState === State.ACTIVE) {
            const { translationY: ty, velocityY: vy } = e.nativeEvent;
            if (ty > 120 || vy > 500) {
                if (hasChanges()) {
                    Animated.parallel([
                        Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
                        Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                    ]).start(() => handleDismiss());
                } else {
                    Animated.parallel([
                        Animated.timing(slideAnim,   { toValue: SH, duration: 200, useNativeDriver: true }),
                        Animated.timing(overlayAnim, { toValue: 0,  duration: 200, useNativeDriver: true }),
                    ]).start(() => onCloseRef.current());
                }
            } else {
                Animated.parallel([
                    Animated.spring(slideAnim,   { toValue: 0, useNativeDriver: true, tension: 120, friction: 8 }),
                    Animated.timing(overlayAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                ]).start();
            }
        }
    };

    const handleSubmit = useCallback(() => {
        const t = title.trim(); if (!t) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onSubmit(t, dueDate, selectedTagIds, { description: description.trim() || undefined, recurrence: recurrence ?? undefined, priority: priority ?? undefined });
        dismiss();
    }, [title, dueDate, selectedTagIds, description, recurrence, priority, onSubmit, dismiss]);

    const pickDay = (date: Date) => {
        setPickedDate(date); setDueDate(format(date, 'yyyy-MM-dd'));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    };
    const setDatePreset = (v: string) => {
        setDueDate(v); const [y,m,d] = v.split('-').map(Number);
        const dt = new Date(y,m-1,d); setPickedDate(dt); setCalMonth(dt);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    };
    const toggleTag = (id: string) => {
        setSelectedTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        setTimeout(() => setOpenRow('notes'), 250);
    };
    const createTag = async () => {
        const t = newTagLabel.trim(); if (!t) return;
        try {
            const tag = await TagService.createTag(t);
            setAvailableTags(p => p.some(x => x.id === tag.id) ? p : [...p, tag]);
            setSelectedTagIds(p => p.includes(tag.id) ? p : [...p, tag.id]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
        } catch { /* limit */ }
        setNewTagLabel(''); setShowNewTag(false);
    };
    const toggle = (row: string) => {
        LayoutAnimation.configureNext({
            duration: 220,
            create: { type: 'easeInEaseOut', property: 'opacity' },
            update: { type: 'spring', springDamping: 0.75 },
            delete: { type: 'easeInEaseOut', property: 'opacity' },
        });
        const isOpening = openRow !== row;
        setOpenRow(v => v === row ? null : row);
        if (isOpening) scrollToRow(row);
    };

    const canSubmit = title.trim().length > 0;
    const priCfg    = PRI.find(p => p.value === priority) ?? PRI[0];
    const today     = startOfDay(new Date());

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.container, { backgroundColor: colors.surfaceElevated, transform: [{ translateY: slideAnim }] }]}>
                {/* Safe Area Top Padding */}
                <View style={{ height: insets.top }} />
                
                <PanGestureHandler onGestureEvent={onHandleGesture} onHandlerStateChange={onHandlerStateChange} activeOffsetY={10} failOffsetX={[-20, 20]}>
                    <Animated.View style={styles.handleWrap}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </Animated.View>
                </PanGestureHandler>

                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={22} color={colors.textMuted} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>New Task</Text>
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: canSubmit ? colors.primary : colors.overlayLight }]} onPress={handleSubmit} disabled={!canSubmit} activeOpacity={0.8}>
                        <Text style={[styles.addBtnTxt, { color: canSubmit ? colors.primaryContrast : colors.textMuted }]}>Add</Text>
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

                        {/* Title input */}
                        <TextInput
                            ref={inputRef}
                            inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                            style={[styles.titleInput, { color: colors.textPrimary }]}
                            placeholder="What needs to happen?"
                            placeholderTextColor={colors.placeholder}
                            value={title} onChangeText={setTitle}
                            returnKeyType="done" onSubmitEditing={canSubmit ? handleSubmit : undefined}
                            maxLength={120} autoCapitalize="sentences"
                            selectionColor={colors.primary} multiline
                        />
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />

                        {/* Due Date row */}
                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle('date')} activeOpacity={0.7} onLayout={e => { rowOffsets.current['date'] = e.nativeEvent.layout.y; }}>
                            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Due Date</Text>
                            <Text style={[styles.rowValue, { color: dueDate === todayStr() ? colors.primary : colors.textPrimary }]}>{fmtDate(dueDate)}</Text>
                            <Ionicons name={openRow === 'date' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        {openRow === 'date' && (
                            <View style={[styles.expandBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                <View style={styles.datePresets}>
                                    {[{ l: 'Today', v: todayStr() }, { l: 'Tomorrow', v: tomorrowStr() }, { l: 'In 7 days', v: localDaysFromNow(7) }].map(({ l, v }) => {
                                        const a = dueDate === v;
                                        return (
                                            <TouchableOpacity key={l} style={[styles.preset, { backgroundColor: a ? colors.primary : colors.surfaceElevated, borderWidth: a ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }]} onPress={() => setDatePreset(v)} activeOpacity={0.7}>
                                                <Text style={[styles.presetTxt, { color: a ? colors.primaryContrast : colors.textPrimary }]}>{l}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <View style={[styles.divider, { marginHorizontal: 0, marginTop: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.border }]} />
                                <View style={styles.calNav}>
                                    <TouchableOpacity onPress={() => setCalMonth(m => subMonths(m, 1))} hitSlop={10}>
                                        <View style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}><Ionicons name="chevron-back" size={16} color={colors.textSecondary} /></View>
                                    </TouchableOpacity>
                                    <Text style={[styles.calMonthTxt, { color: colors.textPrimary }]}>{format(calMonth, 'MMMM yyyy')}</Text>
                                    <TouchableOpacity onPress={() => setCalMonth(m => addMonths(m, 1))} hitSlop={10}>
                                        <View style={[styles.navBtn, { backgroundColor: colors.surfaceElevated }]}><Ionicons name="chevron-forward" size={16} color={colors.textSecondary} /></View>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.calWeekRow}>{WD.map(d => <Text key={d} style={[styles.calWD, { color: colors.textMuted }]}>{d}</Text>)}</View>
                                <View style={styles.calGrid}>
                                    {calCells.map(({ date, key, inMonth }) => {
                                        const past = isBefore(startOfDay(date), today);
                                        const sel  = isSameDay(date, pickedDate);
                                        const tod  = isToday(date);
                                        return (
                                            <TouchableOpacity key={key} disabled={past} activeOpacity={0.6}
                                                style={[styles.calCell, sel && { backgroundColor: colors.primary }, !sel && tod && { backgroundColor: colors.primary + '14' }]}
                                                onPress={() => pickDay(date)}
                                            >
                                                <Text style={[styles.calCellTxt, { fontWeight: sel || tod ? '600' : '400', color: !inMonth || past ? colors.textMuted + '50' : sel ? colors.primaryContrast : tod ? colors.primary : colors.textPrimary }]}>
                                                    {date.getDate()}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Priority row */}
                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle('pri')} activeOpacity={0.7} onLayout={e => { rowOffsets.current['pri'] = e.nativeEvent.layout.y; }}>
                            <Ionicons name="flag-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Priority</Text>
                            {priority ? (
                                <View style={[styles.priValChip, { backgroundColor: priCfg.color + '15' }]}>
                                    <View style={[styles.priDot, { backgroundColor: priCfg.color! }]} />
                                    <Text style={[styles.priValTxt, { color: priCfg.color! }]}>{priCfg.label}</Text>
                                </View>
                            ) : (
                                <Text style={[styles.rowValue, { color: colors.textMuted }]}>None</Text>
                            )}
                            <Ionicons name={openRow === 'pri' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        {openRow === 'pri' && (
                            <View style={[styles.expandBox, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.sm }]}>
                                {PRI.map(opt => {
                                    const a = priority === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.label} style={[styles.priListBtn, { backgroundColor: a ? colors.surfaceElevated : 'transparent' }]}
                                            onPress={() => { 
                                                setPriority(opt.value); 
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined); 
                                                setTimeout(() => setOpenRow('tags'), 250);
                                            }} activeOpacity={0.7}
                                        >
                                            <View style={styles.priListLeft}>
                                                {opt.color ? <View style={[styles.priListDot, { backgroundColor: opt.color }]} /> : <Ionicons name="close-circle-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />}
                                                <Text style={[styles.priListTxt, { color: opt.color ?? colors.textPrimary, fontWeight: a ? '600' : '400' }]}>{opt.label}</Text>
                                            </View>
                                            {a && <Ionicons name="checkmark" size={18} color={opt.color ?? colors.textPrimary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Tags row */}
                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle('tags')} activeOpacity={0.7} onLayout={e => { rowOffsets.current['tags'] = e.nativeEvent.layout.y; }}>
                            <Ionicons name="pricetag-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Tags</Text>
                            {selectedTagIds.length > 0 ? (
                                <View style={styles.tagSummary}>
                                    {selectedTagIds.slice(0, 3).map(id => {
                                        const t = availableTags.find(x => x.id === id);
                                        return t ? <View key={id} style={[styles.tagMiniPill, { backgroundColor: t.color }]} /> : null;
                                    })}
                                    {selectedTagIds.length > 3 && <Text style={[styles.tagMiniTxt, { color: colors.textSecondary }]}>+{selectedTagIds.length - 3}</Text>}
                                </View>
                            ) : (
                                <Text style={[styles.rowValue, { color: colors.textMuted }]}>None</Text>
                            )}
                            <Ionicons name={openRow === 'tags' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        {openRow === 'tags' && (
                            <View style={[styles.expandBox, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.md }]}>
                                <View style={styles.tagGrid}>
                                    {availableTags.map(tag => {
                                        const sel = selectedTagIds.includes(tag.id);
                                        return (
                                            <TouchableOpacity key={tag.id} style={[styles.tagChip, { backgroundColor: sel ? tag.color : colors.surfaceElevated, borderWidth: sel ? 0 : StyleSheet.hairlineWidth, borderColor: colors.border }]} onPress={() => toggleTag(tag.id)} activeOpacity={0.7}>
                                                {!sel && <View style={[styles.tagDot, { backgroundColor: tag.color }]} />}
                                                <Text style={[styles.tagChipTxt, { color: sel ? '#fff' : colors.textPrimary }]}>{tag.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {showNewTag ? (
                                        <View style={[styles.newTagBox, { borderColor: colors.primary }]}>
                                            <TextInput style={[styles.newTagInput, { color: colors.textPrimary }]} placeholder="Tag name" placeholderTextColor={colors.placeholder} value={newTagLabel} onChangeText={setNewTagLabel} onSubmitEditing={createTag} returnKeyType="done" maxLength={24} autoFocus inputAccessoryViewID={KEYBOARD_TOOLBAR_ID} />
                                            <TouchableOpacity onPress={createTag} hitSlop={10}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /></TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={[styles.tagChip, { backgroundColor: colors.surfaceElevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderStyle: 'dashed' }]} onPress={() => { setShowNewTag(true); scrollToRow('tags'); }} activeOpacity={0.7}>
                                            <Ionicons name="add" size={14} color={colors.textMuted} />
                                            <Text style={[styles.tagChipTxt, { color: colors.textMuted }]}>New Tag</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Notes row */}
                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle('notes')} activeOpacity={0.7} onLayout={e => { rowOffsets.current['notes'] = e.nativeEvent.layout.y; }}>
                            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Notes</Text>
                            <Text style={[styles.rowValue, { color: description.trim() ? colors.textPrimary : colors.textMuted }]} numberOfLines={1}>{description.trim() ? 'Added' : 'None'}</Text>
                            <Ionicons name={openRow === 'notes' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        {openRow === 'notes' && (
                            <View style={[styles.expandBox, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0, overflow: 'hidden' }]}>
                                <TextInput style={[styles.notesInput, { color: colors.textPrimary, backgroundColor: colors.surfaceElevated }]} placeholder="Write additional context or links here..." placeholderTextColor={colors.placeholder} value={description} onChangeText={setDescription} multiline maxLength={500} textAlignVertical="top" autoFocus inputAccessoryViewID={KEYBOARD_TOOLBAR_ID} />
                            </View>
                        )}

                        {/* Repeat row */}
                        <TouchableOpacity style={[styles.row, { borderBottomColor: colors.border }]} onPress={() => toggle('rec')} activeOpacity={0.7} onLayout={e => { rowOffsets.current['rec'] = e.nativeEvent.layout.y; }}>
                            <Ionicons name="repeat" size={20} color={colors.textSecondary} />
                            <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Repeat</Text>
                            <Text style={[styles.rowValue, { color: recurrence ? colors.primary : colors.textMuted }]}>{REC.find(r => r.value === recurrence)?.label ?? 'Never'}</Text>
                            <Ionicons name={openRow === 'rec' ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                        {openRow === 'rec' && (
                            <View style={[styles.expandBox, { backgroundColor: colors.surface, borderColor: colors.border, padding: spacing.sm }]}>
                                {REC.map(opt => {
                                    const a = recurrence === opt.value;
                                    return (
                                        <TouchableOpacity key={opt.label} style={[styles.priListBtn, { backgroundColor: a ? colors.surfaceElevated : 'transparent' }]} 
                                            onPress={() => {
                                                setRecurrence(opt.value);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>undefined);
                                                setTimeout(() => setOpenRow(null), 250);
                                            }} activeOpacity={0.7}
                                        >
                                            <Text style={[styles.priListTxt, { color: a ? colors.primary : colors.textPrimary, fontWeight: a ? '600' : '400' }]}>{opt.label}</Text>
                                            {a && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}

                        {/* Bottom Actions */}
                        <View style={styles.bottomActions}>
                            <TouchableOpacity style={styles.bottomDiscardBtn} onPress={handleDismiss} activeOpacity={0.7}>
                                <Text style={[styles.bottomDiscardTxt, { color: colors.textMuted }]}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.bottomAddBtn, { backgroundColor: canSubmit ? colors.primary : colors.overlayLight }]} onPress={handleSubmit} disabled={!canSubmit} activeOpacity={0.8}>
                                <Text style={[styles.bottomAddTxt, { color: canSubmit ? colors.primaryContrast : colors.textMuted }]}>Add Task</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ height: insets.bottom + spacing.xl }} />
                    </ScrollView>
                </KeyboardAvoidingView>
            </Animated.View>
            <KeyboardToolbar />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container:    { flex: 1 },
    handleWrap:   { alignItems: 'center', paddingVertical: 14 },
    handle:       { width: 36, height: 4, borderRadius: 2, opacity: 0.4 },
    header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
    headerTitle:  { fontSize: 17, fontWeight: '700' },
    addBtn:       { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full },
    addBtnTxt:    { fontSize: 15, fontWeight: '800' },
    titleInput:   { fontSize: 28, fontWeight: '600', lineHeight: 34, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md, minHeight: 90 },
    divider:      { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xl, marginBottom: spacing.md },
    row:          { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: 18 },
    rowLabel:     { fontSize: 17, fontWeight: '600', flex: 1 },
    rowValue:     { fontSize: 16, fontWeight: '500', maxWidth: '45%', textAlign: 'right' },
    expandBox:    { marginHorizontal: spacing.xl, marginBottom: spacing.md, borderRadius: borderRadius.lg, borderWidth: StyleSheet.hairlineWidth },
    datePresets:  { flexDirection: 'row', padding: spacing.sm, gap: spacing.xs },
    preset:       { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: borderRadius.md },
    presetTxt:    { fontSize: 14, fontWeight: '600' },
    calNav:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: spacing.xs },
    navBtn:       { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    calMonthTxt:  { fontSize: 14, fontWeight: '600' },
    calWeekRow:   { flexDirection: 'row', paddingHorizontal: spacing.sm, marginBottom: 2 },
    calWD:        { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
    calGrid:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
    calCell:      { width: `${100/7}%` as any, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    calCellTxt:   { fontSize: 13 },
    priValChip:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full },
    priValTxt:    { fontSize: 14, fontWeight: '700' },
    priDot:       { width: 10, height: 10, borderRadius: 5 },
    priListBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: borderRadius.md },
    priListLeft:  { flexDirection: 'row', alignItems: 'center' },
    priListDot:   { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
    priListTxt:   { fontSize: 16 },
    tagSummary:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
    tagMiniPill:  { width: 14, height: 14, borderRadius: 7 },
    tagMiniTxt:   { fontSize: 14, fontWeight: '700', marginLeft: 2 },
    tagGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    tagChip:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: borderRadius.full, gap: 6 },
    tagDot:       { width: 10, height: 10, borderRadius: 5 },
    tagChipTxt:   { fontSize: 15, fontWeight: '600' },
    newTagBox:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 4, gap: 6 },
    newTagInput:  { fontSize: 15, minWidth: 70, paddingVertical: 4 },
    notesInput:       { fontSize: 16, lineHeight: 24, minHeight: 120, padding: spacing.md },
    bottomActions:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.xl, paddingBottom: spacing.xl },
    bottomDiscardBtn: { paddingVertical: 12, paddingHorizontal: 16, marginLeft: -16 },
    bottomDiscardTxt: { fontSize: 16, fontWeight: '600' },
    bottomAddBtn:     { flex: 1, marginLeft: spacing.xl, paddingVertical: 16, borderRadius: borderRadius.full, alignItems: 'center' },
    bottomAddTxt:     { fontSize: 16, fontWeight: '700' },
});
