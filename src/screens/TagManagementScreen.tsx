// Ravyn — Tag Management Screen
// Rename and delete tags. Accessible from Profile screen.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    Modal,
    Animated,
    KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { spacing, borderRadius, typography } from '../theme';
import { layout } from '../components/ds';
import * as TagService from '../services/tagService';
import { syncInBackground } from '../services/syncService';
import type { Tag } from '../types';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from '../components/KeyboardToolbar';
import { TAG_COLORS } from '../types';

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function TagManagementScreen({ visible, onClose }: Props) {
    const { colors } = useTheme();
    const { showToast } = useToast();
    const insets = useSafeAreaInsets();

    const [tags, setTags] = useState<Tag[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editLabel, setEditLabel] = useState('');
    const inputRefs = useRef<Record<string, TextInput | null>>({});
    const slideAnim = useRef(new Animated.Value(600)).current;

    const loadTags = useCallback(async () => {
        const all = await TagService.getAllTags();
        setTags(all);
    }, []);

    useEffect(() => {
        if (visible) {
            loadTags();
            Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 300, useNativeDriver: true }).start();
        } else {
            slideAnim.setValue(600);
            setEditingId(null);
        }
    }, [visible]);

    const startEdit = (tag: Tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        setEditingId(tag.id);
        setEditLabel(tag.label);
        setTimeout(() => inputRefs.current[tag.id]?.focus(), 100);
    };

    const commitEdit = async (tag: Tag) => {
        const trimmed = editLabel.trim();
        setEditingId(null);
        if (!trimmed || trimmed === tag.label) return;
        await TagService.updateTag(tag.id, { label: trimmed });
        await loadTags();
        syncInBackground();
        showToast('Tag renamed', 'success', '✓');
    };

    const cycleColor = async (tag: Tag) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        const idx = TAG_COLORS.indexOf(tag.color as typeof TAG_COLORS[number]);
        const next = TAG_COLORS[(idx + 1) % TAG_COLORS.length];
        await TagService.updateTag(tag.id, { color: next });
        await loadTags();
        syncInBackground();
    };

    const handleDelete = (tag: Tag) => {
        const confirm = async () => {
            await TagService.deleteTag(tag.id);
            await loadTags();
            syncInBackground();
            showToast(`"${tag.label}" deleted`, 'info', '🗑');
        };
        if (Platform.OS === 'web') {
            if (window.confirm(`Delete tag "${tag.label}"? It will be removed from all tasks.`)) confirm();
        } else {
            Alert.alert('Delete Tag', `Remove "${tag.label}" from all tasks?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: confirm },
            ]);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <Animated.View
                style={[
                    styles.root,
                    { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] },
                ]}
            >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + spacing.md, borderBottomColor: colors.divider }]}>
                <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Manage Tags</Text>
                <View style={{ width: 44 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
            <ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                {tags.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="pricetag-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No tags yet</Text>
                        <Text style={[styles.emptyMsg, { color: colors.textMuted }]}>
                            Create tags when adding tasks to organise your work.
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={[styles.hint, { color: colors.textMuted }]}>
                            Tap a tag to rename · Tap the swatch to change colour
                        </Text>
                        {tags.map((tag) => {
                            const isEditing = editingId === tag.id;
                            return (
                                <View
                                    key={tag.id}
                                    style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                                >
                                    {/* Color swatch — tap to cycle */}
                                    <TouchableOpacity
                                        style={[styles.swatch, { backgroundColor: tag.color }]}
                                        onPress={() => cycleColor(tag)}
                                        activeOpacity={0.7}
                                        hitSlop={8}
                                    />

                                    {/* Label / inline edit */}
                                    {isEditing ? (
                                        <TextInput
                                            ref={(r) => { inputRefs.current[tag.id] = r; }}
                                            inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                            style={[styles.input, { color: colors.textPrimary, borderColor: colors.primary }]}
                                            value={editLabel}
                                            onChangeText={setEditLabel}
                                            maxLength={24}
                                            autoCapitalize="words"
                                            selectionColor={colors.primary}
                                            returnKeyType="done"
                                            onSubmitEditing={() => commitEdit(tag)}
                                            onBlur={() => commitEdit(tag)}
                                        />
                                    ) : (
                                        <TouchableOpacity style={styles.labelWrap} onPress={() => startEdit(tag)} activeOpacity={0.7}>
                                            <Text style={[styles.label, { color: colors.textPrimary }]}>{tag.label}</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Actions */}
                                    {isEditing ? (
                                        <TouchableOpacity onPress={() => commitEdit(tag)} hitSlop={12} style={styles.actionBtn}>
                                            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                                        </TouchableOpacity>
                                    ) : (
                                        <>
                                            <TouchableOpacity onPress={() => startEdit(tag)} hitSlop={12} style={styles.actionBtn}>
                                                <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDelete(tag)} hitSlop={12} style={styles.actionBtn}>
                                                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            );
                        })}
                    </>
                )}
            </ScrollView>
            </KeyboardAvoidingView>
            <KeyboardToolbar />
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: layout.screenPaddingX,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 44,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    content: {
        paddingHorizontal: layout.screenPaddingX,
        paddingTop: spacing.xl,
    },
    hint: {
        fontSize: 13,
        marginBottom: spacing.lg,
        lineHeight: 18,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 2,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    swatch: {
        width: 24,
        height: 24,
        borderRadius: 12,
        flexShrink: 0,
    },
    labelWrap: {
        flex: 1,
        paddingVertical: 4,
    },
    label: {
        fontSize: 15,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        borderWidth: 1.5,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
    },
    actionBtn: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    empty: {
        alignItems: 'center',
        paddingTop: 80,
        gap: spacing.sm,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginTop: spacing.md,
    },
    emptyMsg: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 260,
    },
});
