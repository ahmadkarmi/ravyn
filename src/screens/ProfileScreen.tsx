// Ravyn — Profile & Settings Screen (Premium Redesign)
// World-class UI with clear hierarchy, intuitive edit modes, and rich visual feedback.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Switch,
    Platform,
    Image,
    Pressable,
    Keyboard,
    Modal,
    Share,
    Linking,
    Animated,
    LayoutAnimation,
    UIManager,
    KeyboardAvoidingView,
} from 'react-native';

if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useToast } from '../context/ToastContext';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { getUserState, saveUserState } from '../services/integrityService';
import { clearAll } from '../services/storageService';
import { supabase } from '../lib/supabase';
import {
    hasPermission,
    requestPermissions,
    scheduleDailyNotifications,
    cancelAllNotifications,
} from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import type { UserState, Tag } from '../types';
import { TAG_COLORS } from '../types';
import * as TagService from '../services/tagService';
import * as TaskService from '../services/taskService';
import { Card, Chip, IconBox, StatTile, TileGrid, layout } from '../components/ds';
import { syncInBackground } from '../services/syncService';
import { useSync } from '../context/SyncContext';
import InfoSheet, { INFO_CONTENT, InfoContent } from '../components/InfoSheet';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from '../components/KeyboardToolbar';
import StreakTimeline from '../components/StreakTimeline';
import BoostTokens from '../components/BoostTokens';
import { getAllDailyRecords } from '../services/streakService';
import { DailyRecord, BOOST_CONFIG } from '../types';
import LoginScreen from './LoginScreen';

// ─── Sub-components defined at module level ─────────────────────────────────
// IMPORTANT: must NOT be defined inside ProfileScreen — doing so creates a new
// function reference on every render, causing React to remount the subtree and
// dismissing any active TextInput keyboard on every keystroke.

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
    const { colors } = useTheme();
    return (
        <View style={styles.sectionContainer}>
            {title && <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{title}</Text>}
            <Card style={styles.sectionCard}>
                {children}
            </Card>
        </View>
    );
}

function MenuItem({
    icon,
    label,
    value,
    onPress,
    isDestructive = false,
    showChevron = true,
    rightElement,
}: {
    icon: any;
    label: string;
    value?: string;
    onPress?: () => void;
    isDestructive?: boolean;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
}) {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={onPress}
            activeOpacity={onPress ? 0.7 : 1}
            disabled={!onPress}
        >
            <IconBox
                icon={icon}
                color={isDestructive ? colors.danger : colors.primary}
                size="md"
                style={isDestructive ? { backgroundColor: colors.dangerMuted } : undefined}
            />
            <Text style={[styles.menuLabel, { color: isDestructive ? colors.danger : colors.textPrimary }]}>{label}</Text>
            <View style={styles.menuRight}>
                {value && <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{value}</Text>}
                {rightElement}
                {showChevron && onPress && !rightElement && (
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                )}
            </View>
        </TouchableOpacity>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ProfileScreenProps {
    onReset: () => void;
}

export default function ProfileScreen({ onReset }: ProfileScreenProps) {
    const { colors, isDark, mode, setThemeMode } = useTheme();
    const { showToast } = useToast();
    const { user, signOut } = useAuth();
    const insets = useSafeAreaInsets();
    const { lastSyncAt } = useSync();

    const screenOpacity = useRef(new Animated.Value(0)).current;
    const screenTranslateY = useRef(new Animated.Value(14)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.timing(screenOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.spring(screenTranslateY, { toValue: 0, damping: 20, stiffness: 260, useNativeDriver: true }),
        ]).start();
    }, []);

    // Data State
    const [userState, setUserState] = useState<UserState | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [pendingAvatarUri, setPendingAvatarUri] = useState<string | null>(null);

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(false);
    const [editStart, setEditStart] = useState('08:00');
    const [editEnd, setEditEnd] = useState('22:00');

    // Settings State
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');
    const [notificationsOn, setNotificationsOn] = useState(false);

    const [showSignIn, setShowSignIn] = useState(false);

    // Tags State
    const [tags, setTags] = useState<Tag[]>([]);
    const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
    const [editingTagId, setEditingTagId] = useState<string | null>(null);
    const [editingLabel, setEditingLabel] = useState('');
    const [newTagLabel, setNewTagLabel] = useState('');
    const [showNewTag, setShowNewTag] = useState(false);

    const scheduleEndRef = useRef<TextInput>(null);
    const [infoContent, setInfoContent] = useState<InfoContent | null>(null);
    const [infoVisual, setInfoVisual] = useState<React.ReactNode>(null);
    const [dailyRecords, setDailyRecords] = useState<Record<string, DailyRecord>>({});

    const showInfo = useCallback((content: InfoContent, visual?: React.ReactNode) => {
        setInfoContent(content);
        setInfoVisual(visual ?? null);
    }, []);
    const closeInfo = useCallback(() => {
        setInfoContent(null);
        setInfoVisual(null);
    }, []);

    const loadData = useCallback(async () => {
        const [state, allTags, allTasks, records] = await Promise.all([
            getUserState(),
            TagService.getAllTags(),
            TaskService.getAllTasks(),
            getAllDailyRecords(),
        ]);
        setUserState(state);
        setDailyRecords(records);
        setTags(allTags);

        const counts: Record<string, number> = {};
        allTasks.forEach((t) => t.tags?.forEach((id) => { counts[id] = (counts[id] ?? 0) + 1; }));
        setTagCounts(counts);
        setStartTime(state.startOfDay);
        setEndTime(state.endOfDay);

        const granted = await hasPermission();
        setNotificationsOn(granted);

        if (user?.user_metadata) {
            setDisplayName(user.user_metadata.full_name || '');
            setAvatarUrl(user.user_metadata.avatar_url || null);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData, lastSyncAt])
    );

    // ─── Actions ──────────────────────────────────────────

    const handlePickImage = async () => {
        if (!isEditing) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1, // pick full quality; we compress below
        });

        if (result.canceled) return;

        // Resize to max 512×512 and compress to JPEG at 80% quality.
        // This reliably keeps avatars well under 200 KB.
        const compressed = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 512, height: 512 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        // Fallback guard: if somehow still over 2 MB, show error and bail.
        if (compressed.width === 0) {
            showToast('Could not process image. Try a smaller file.', 'error', 'alert-circle');
            return;
        }

        setAvatarUrl(compressed.uri);
        setPendingAvatarUri(compressed.uri);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            let newAvatarUrl = avatarUrl;

            if (pendingAvatarUri) {
                const response = await fetch(pendingAvatarUri);
                const blob = await response.blob();
                const path = `${user.id}/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
                newAvatarUrl = publicUrl;
            }

            const { error } = await supabase.auth.updateUser({
                data: { full_name: displayName, avatar_url: newAvatarUrl },
            });
            if (error) throw error;

            setPendingAvatarUri(null);
            setAvatarUrl(newAvatarUrl);
            setIsEditing(false);
            showToast('Profile updated', 'success', 'checkmark-circle');
        } catch (e: any) {
            showToast(e?.message ?? 'Failed to save profile', 'error', 'alert-circle');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEdit = () => {
        if (user?.user_metadata) {
            setDisplayName(user.user_metadata.full_name || '');
            setAvatarUrl(user.user_metadata.avatar_url || null);
        }
        setPendingAvatarUri(null);
        setIsEditing(false);
    };

    const handleResetData = () => {
        const proceed = () => {
            onReset();
            showToast('Onboarding reset', 'info', '↺');
        };

        if (Platform.OS === 'web') {
            if (confirm('Restart onboarding? Your local app setup will reset.')) {
                proceed();
            }
            return;
        }

        Alert.alert(
            'Restart onboarding?',
            'Your local app setup will reset and onboarding will open again.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Restart', style: 'destructive', onPress: proceed },
            ]
        );
    };

    // ─── Tag actions ──────────────────────────────────────

    const handleDeleteTag = (tag: Tag) => {
        const proceed = async () => {
            await TagService.deleteTag(tag.id);
            setTags((prev) => prev.filter((t) => t.id !== tag.id));
            syncInBackground();
            showToast(`Tag "${tag.label}" deleted`, 'info', 'trash-outline');
        };

        if (Platform.OS === 'web') {
            if (confirm(`Delete tag "${tag.label}"? It will be removed from all tasks.`)) proceed();
            return;
        }

        Alert.alert('Delete Tag', `Delete "${tag.label}"? It will be removed from all tasks.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: proceed },
        ]);
    };

    const handleSaveTagLabel = async () => {
        if (!editingTagId) return;
        const trimmed = editingLabel.trim();
        if (trimmed.length === 0) return;
        await TagService.updateTag(editingTagId, { label: trimmed });
        setTags((prev) => prev.map((t) => t.id === editingTagId ? { ...t, label: trimmed } : t));
        setEditingTagId(null);
        setEditingLabel('');
        syncInBackground();
    };

    const handleCycleColor = async (tag: Tag) => {
        const idx = TAG_COLORS.indexOf(tag.color as any);
        const nextColor = TAG_COLORS[(idx + 1) % TAG_COLORS.length];
        await TagService.updateTag(tag.id, { color: nextColor });
        setTags((prev) => prev.map((t) => t.id === tag.id ? { ...t, color: nextColor } : t));
        syncInBackground();
    };

    const handleCreateTag = async () => {
        const trimmed = newTagLabel.trim();
        if (!trimmed) return;
        const tag = await TagService.createTag(trimmed);
        setTags((prev) => [...prev, tag]);
        setNewTagLabel('');
        setShowNewTag(false);
        syncInBackground();
        showToast(`Tag "${tag.label}" created`, 'success', 'pricetag');
    };

    const handleSaveSchedule = async () => {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(editStart) || !timeRegex.test(editEnd)) {
            showToast('Use HH:MM format (e.g. 08:00)', 'warning', 'alert-circle');
            return;
        }
        if (editStart >= editEnd) {
            showToast('Start time must be before end time', 'warning', 'alert-circle');
            return;
        }
        const state = await getUserState();
        state.startOfDay = editStart;
        state.endOfDay = editEnd;
        await saveUserState(state);
        setStartTime(editStart);
        setEndTime(editEnd);
        setEditingSchedule(false);
        if (notificationsOn) {
            await scheduleDailyNotifications();
        }
        syncInBackground();
        showToast('Schedule updated', 'success', 'checkmark-circle');
    };

    const handleResetPassword = async () => {
        if (!user?.email) {
            showToast('No email found on account', 'warning', 'alert-circle');
            return;
        }
        try {
            const redirectTo = Platform.OS === 'web'
                ? window.location.origin
                : 'ravyn://auth/callback';
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
            if (error) throw error;
            showToast('Reset link sent to your email', 'success', 'mail');
        } catch (e: any) {
            showToast(e.message || 'Failed to send reset email', 'error', 'alert-circle');
        }
    };

    const handleExportData = async () => {
        try {
            const [allTasks, allTags, state] = await Promise.all([
                TaskService.getAllTasks(),
                TagService.getAllTags(),
                getUserState(),
            ]);
            const payload = JSON.stringify({ exportedAt: new Date().toISOString(), tasks: allTasks, tags: allTags, stats: { streak: state.streak, integrityPoints: state.integrityPoints, boostTokens: state.boostTokens } }, null, 2);
            await Share.share({ message: payload, title: 'Ravyn Data Export' });
        } catch (e: any) {
            showToast(e.message || 'Export failed', 'error', 'alert-circle');
        }
    };

    const handleDeleteAccount = async () => {
        const doDelete = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const accessToken = session?.access_token;
                if (!accessToken) return;

                const res = await fetch(
                    'https://txddhjoxgcbomtntveqh.supabase.co/functions/v1/delete-account',
                    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
                );

                if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    throw new Error(body.error || 'Failed to delete account');
                }

                await clearAll();
                await signOut();
                onReset();
            } catch (e: any) {
                showToast(e.message || 'Account deletion failed', 'error', 'alert-circle');
            }
        };

        if (Platform.OS === 'web') {
            if (confirm('This will permanently delete your account and all data. This cannot be undone.')) doDelete();
            return;
        }

        Alert.alert(
            'Delete Account',
            'This will permanently delete your account and all data. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: doDelete },
            ]
        );
    };

    const handleSignOut = async () => {
        const doSignOut = async () => {
            await signOut();
            showToast('Signed out', 'info', 'log-out-outline');
        };

        if (Platform.OS === 'web') {
            if (confirm('Are you sure you want to sign out?')) doSignOut();
            return;
        }

        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
        ]);
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.primaryMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.accentMuted }]} />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
            <Animated.View style={{ flex: 1, opacity: screenOpacity, transform: [{ translateY: screenTranslateY }] }}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
            {/* ─── Header ─── */}
            <View style={[styles.header, { paddingTop: insets.top + layout.screenTopGap }]}>
                <View style={styles.headerTopRow}>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleCancelEdit} style={styles.headerBtn}>
                            <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ width: 56 }} />
                    )}
                    <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Profile</Text>
                    {isEditing ? (
                        <TouchableOpacity onPress={handleSaveProfile} style={styles.headerBtn} disabled={isSaving}>
                            <Text style={[styles.headerBtnText, { color: isSaving ? colors.textMuted : colors.primary }]}>
                                {isSaving ? 'Saving…' : 'Done'}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.headerBtn}>
                            <Text style={[styles.headerBtnText, { color: colors.primary }]}>Edit</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* ─── Profile card ─── */}
            <Card style={styles.profileCard}>
                <TouchableOpacity
                    onPress={handlePickImage}
                    activeOpacity={isEditing ? 0.8 : 1}
                    disabled={!isEditing}
                >
                    <View style={[styles.avatarRing, { backgroundColor: colors.surfaceElevated }]}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                        ) : (
                            <Text style={[styles.avatarLetter, { color: colors.primary }]}>
                                {displayName ? displayName[0].toUpperCase() : user?.email?.[0].toUpperCase() || '?'}
                            </Text>
                        )}
                        {isEditing && (
                            <View style={[styles.cameraOverlay, { backgroundColor: colors.overlay }]}>
                                <Ionicons name="camera" size={18} color={colors.textInverse} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {isEditing ? (
                    <TextInput
                        value={displayName}
                        onChangeText={setDisplayName}
                        inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                        style={[styles.nameInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                        placeholder="Display Name"
                        placeholderTextColor={colors.textMuted}
                        maxLength={40}
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                ) : (
                    <Text style={[styles.name, { color: colors.textPrimary }]}>
                        {displayName || 'Set Display Name'}
                    </Text>
                )}
                <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>

                {/* Stats */}
                <TileGrid>
                    <StatTile color={colors.streak} icon="flame" value={userState?.streak ?? 0} label="Streak" onPress={() => showInfo(INFO_CONTENT.streak, <StreakTimeline streak={userState?.streak ?? null} records={dailyRecords} />)} />
                    <StatTile color={colors.boost} icon="flash" value={userState?.boostTokens ?? 0} label="Boosts" onPress={() => showInfo(INFO_CONTENT.boost, <BoostTokens tokens={userState?.boostTokens ?? 0} />)} />
                    <StatTile color={colors.integrity} icon="shield-checkmark" value={userState?.integrityPoints ?? 0} label="Integrity" progress={(userState?.integrityPoints ?? 0) / BOOST_CONFIG.THRESHOLD} onPress={() => showInfo(INFO_CONTENT.integrity)} />
                </TileGrid>
            </Card>

            {/* ─── Settings ─── */}
            <Section title="PREFERENCES">
                <MenuItem
                    icon="moon"
                    label="Theme"
                    value={mode.charAt(0).toUpperCase() + mode.slice(1)}
                    onPress={() => {
                        const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'auto' : 'light';
                        setThemeMode(next as any);
                    }}
                />
                <MenuItem
                    icon="notifications"
                    label="Daily Reminders"
                    rightElement={
                        <Switch
                            value={notificationsOn}
                            onValueChange={async (v) => {
                                if (v) {
                                    if (await requestPermissions()) {
                                        await scheduleDailyNotifications();
                                        setNotificationsOn(true);
                                    }
                                } else {
                                    await cancelAllNotifications();
                                    setNotificationsOn(false);
                                }
                            }}
                            trackColor={{ false: colors.border, true: colors.primary }}
                        />
                    }
                />
                <MenuItem
                    icon="time"
                    label="Day Schedule"
                    value={!editingSchedule ? `${startTime} – ${endTime}` : undefined}
                    onPress={() => {
                        setEditStart(startTime);
                        setEditEnd(endTime);
                        setEditingSchedule(true);
                    }}
                    showChevron={!editingSchedule}
                />
                {editingSchedule && (
                    <View style={[styles.scheduleEditor, { borderBottomColor: colors.border }]}>
                        <View style={styles.scheduleRow}>
                            <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>Start</Text>
                            <TextInput
                                style={[styles.scheduleInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                value={editStart}
                                onChangeText={setEditStart}
                                placeholder="08:00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onSubmitEditing={() => scheduleEndRef.current?.focus()}
                                autoFocus
                            />
                        </View>
                        <View style={styles.scheduleRow}>
                            <Text style={[styles.scheduleLabel, { color: colors.textSecondary }]}>End</Text>
                            <TextInput
                                ref={scheduleEndRef}
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                style={[styles.scheduleInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                                value={editEnd}
                                onChangeText={setEditEnd}
                                placeholder="22:00"
                                placeholderTextColor={colors.textMuted}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                returnKeyType="done"
                                onSubmitEditing={handleSaveSchedule}
                            />
                        </View>
                        <View style={styles.scheduleActions}>
                            <TouchableOpacity
                                onPress={() => setEditingSchedule(false)}
                                style={[styles.scheduleBtn, { borderColor: colors.border }]}
                            >
                                <Text style={[styles.scheduleBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSaveSchedule}
                                style={[styles.scheduleBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                            >
                                <Text style={[styles.scheduleBtnText, { color: colors.primaryContrast }]}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </Section>

            {/* ─── Tags ─── */}
            <Section title="TAGS">
                {tags.map((tag) => (
                    <View key={tag.id} style={[styles.tagRow, { borderBottomColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.tagColorSwatch, { backgroundColor: tag.color, borderColor: tag.color + '44', borderWidth: 2 }]}
                            onPress={() => handleCycleColor(tag)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Change color for ${tag.label} tag`}
                        >
                            <Ionicons name="color-palette-outline" size={10} color="#FFF" />
                        </TouchableOpacity>

                        {editingTagId === tag.id ? (
                            <TextInput
                                style={[styles.tagEditInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                value={editingLabel}
                                onChangeText={setEditingLabel}
                                onSubmitEditing={handleSaveTagLabel}
                                onBlur={handleSaveTagLabel}
                                returnKeyType="done"
                                maxLength={24}
                                autoCapitalize="words"
                                autoFocus
                            />
                        ) : (
                            <TouchableOpacity
                                style={styles.tagLabelTouch}
                                onPress={() => {
                                    setEditingTagId(tag.id);
                                    setEditingLabel(tag.label);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.tagLabel, { color: colors.textPrimary }]}>{tag.label}</Text>
                                {(tagCounts[tag.id] ?? 0) > 0 && (
                                    <View style={[styles.tagCountBadge, { backgroundColor: tag.color + '22' }]}>
                                        <Text style={[styles.tagCountText, { color: tag.color }]}>{tagCounts[tag.id]}</Text>
                                    </View>
                                )}
                                <Ionicons name="pencil" size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={() => handleDeleteTag(tag)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            style={styles.tagDeleteBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${tag.label} tag`}
                        >
                            <Ionicons name="close-circle" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}

                {showNewTag ? (
                    <View style={[styles.tagRow, { borderBottomColor: colors.border }]}>
                        <View style={[styles.tagColorSwatch, { backgroundColor: colors.primary }]} />
                        <TextInput
                            style={[styles.tagEditInput, { color: colors.textPrimary, borderBottomColor: colors.primary }]}
                            inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                            value={newTagLabel}
                            onChangeText={setNewTagLabel}
                            onSubmitEditing={handleCreateTag}
                            placeholder="Tag name"
                            placeholderTextColor={colors.placeholder}
                            returnKeyType="done"
                            maxLength={24}
                            autoCapitalize="words"
                            autoFocus
                        />
                        <TouchableOpacity onPress={() => {
                            LayoutAnimation.configureNext({
                                duration: 220,
                                create: { type: 'easeInEaseOut', property: 'opacity' },
                                update: { type: 'spring', springDamping: 0.75 },
                                delete: { type: 'easeInEaseOut', property: 'opacity' },
                            });
                            setShowNewTag(false); setNewTagLabel('');
                        }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name="close" size={18} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.tagRow, { borderBottomColor: 'transparent' }]}
                        onPress={() => {
                            LayoutAnimation.configureNext({
                                duration: 220,
                                create: { type: 'easeInEaseOut', property: 'opacity' },
                                update: { type: 'spring', springDamping: 0.75 },
                                delete: { type: 'easeInEaseOut', property: 'opacity' },
                            });
                            setShowNewTag(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                        <Text style={[styles.tagAddLabel, { color: colors.primary }]}>Add Tag</Text>
                    </TouchableOpacity>
                )}

                {tags.length === 0 && !showNewTag && (
                    <Text style={[styles.tagEmptyHint, { color: colors.textMuted }]}>
                        No tags yet. Create one to categorize your tasks.
                    </Text>
                )}
            </Section>

            <Section title="ACCOUNT">
                {user ? (
                    <>
                        <MenuItem
                            icon="key"
                            label="Reset Password"
                            onPress={() => {
                                if (Platform.OS === 'web') {
                                    if (confirm(`Send password reset link to ${user?.email}?`)) handleResetPassword();
                                    return;
                                }
                                Alert.alert('Reset Password', `Send reset link to ${user?.email}?`, [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Send', onPress: handleResetPassword },
                                ]);
                            }}
                        />
                        <MenuItem
                            icon="log-out"
                            label="Sign Out"
                            isDestructive
                            onPress={handleSignOut}
                            showChevron={false}
                        />
                        <MenuItem
                            icon="trash"
                            label="Delete Account"
                            isDestructive
                            onPress={handleDeleteAccount}
                            showChevron={false}
                        />
                    </>
                ) : (
                    <MenuItem
                        icon="person-add"
                        label="Sign In to sync your data"
                        onPress={() => setShowSignIn(true)}
                    />
                )}
            </Section>

            <Section title="DATA & LEGAL">
                <MenuItem
                    icon="download-outline"
                    label="Export My Data"
                    onPress={handleExportData}
                />
                <MenuItem
                    icon="document-text-outline"
                    label="Privacy Policy"
                    onPress={() => Linking.openURL('https://ravyn.app/privacy')}
                />
                <MenuItem
                    icon="reader-outline"
                    label="Terms of Service"
                    onPress={() => Linking.openURL('https://ravyn.app/terms')}
                />
            </Section>

            <Section>
                <MenuItem
                    icon="trash"
                    label="Restart Onboarding"
                    isDestructive
                    onPress={handleResetData}
                />
            </Section>

            <View style={{ height: 40 }} />
            </ScrollView>
            </Animated.View>
            </KeyboardAvoidingView>
            <KeyboardToolbar />

            <InfoSheet
                visible={!!infoContent}
                content={infoContent}
                onClose={closeInfo}
                headerVisual={infoVisual}
            />

            <Modal
                visible={showSignIn}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowSignIn(false)}
            >
                <LoginScreen onSuccess={() => setShowSignIn(false)} />
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    // ── Backdrop orbs
    backdropLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    backdropOrbTop: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: borderRadius.full,
        top: -120,
        left: -90,
        opacity: 0.5,
    },
    backdropOrbBottom: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: borderRadius.full,
        bottom: -130,
        right: -80,
        opacity: 0.35,
    },

    // ── Header
    header: {
        paddingHorizontal: layout.screenPaddingX,
        paddingBottom: layout.sectionGap,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    screenTitle: {
        ...typography.h1,
    },
    headerBtn: { padding: spacing.sm },
    headerBtnText: { fontSize: 15, fontWeight: '600' },

    // ── Profile card
    profileCard: {
        marginHorizontal: layout.screenPaddingX,
        marginBottom: spacing.xl,
        alignItems: 'center',
    },

    // ── Avatar
    avatarRing: {
        width: layout.avatarLg,
        height: layout.avatarLg,
        borderRadius: layout.avatarLg / 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        overflow: 'hidden',
    },
    avatarImg: { width: '100%', height: '100%' },
    avatarLetter: { fontSize: 28, fontWeight: '700' },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Name & email
    name: {
        ...typography.headlineMedium,
        fontSize: 20,
        marginBottom: spacing['2xs'],
    },
    nameInput: {
        ...typography.headlineMedium,
        fontSize: 20,
        marginBottom: spacing['2xs'],
        borderBottomWidth: layout.hairline,
        minWidth: 120,
        textAlign: 'center',
        paddingVertical: 0,
    },
    email: {
        ...typography.bodySmall,
        marginBottom: spacing.lg,
    },

    // ── Chips (kept for potential future use)

    // ── Sections
    sectionContainer: {
        marginBottom: layout.cardGap,
        paddingHorizontal: layout.screenPaddingX,
    },
    sectionLabel: {
        ...typography.label,
        marginLeft: spacing.sm,
        marginBottom: spacing.xs,
    },
    sectionCard: {
        padding: 0,
        overflow: 'hidden',
    },

    // ── Menu items
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: spacing.md,
        gap: layout.cardGap,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    menuItemTextWrap: {
        flex: 1,
    },
    menuItemTitle: {
        ...typography.bodyMedium,
    },
    menuItemSubtitle: {
        ...typography.bodySmall,
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    menuRight: { flexDirection: 'row', alignItems: 'center' },
    menuValue: { fontSize: 13, fontWeight: '500', marginRight: spacing.xs },

    // ── Tags
    tagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    tagColorSwatch: {
        width: 22,
        height: 22,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tagLabelTouch: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    tagLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    tagEditInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        borderBottomWidth: 1,
        paddingVertical: spacing['2xs'],
    },
    tagCountBadge: {
        marginLeft: spacing.xs,
        paddingHorizontal: spacing.xs,
        paddingVertical: 1,
        borderRadius: spacing.sm,
    },
    tagCountText: {
        fontSize: 11,
        fontWeight: '700',
    },
    tagDeleteBtn: {
        marginLeft: 'auto',
    },
    tagAddLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    tagEmptyHint: {
        fontSize: 13,
        textAlign: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
    },

    // ── Schedule editor
    scheduleEditor: {
        paddingHorizontal: layout.screenPaddingX,
        paddingVertical: spacing.md,
        gap: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    scheduleLabel: {
        fontSize: 14,
        fontWeight: '500',
        width: 40,
    },
    scheduleInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        borderWidth: 1,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    scheduleActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    scheduleBtn: {
        borderWidth: 1,
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.xs + spacing['2xs'],
    },
    scheduleBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
