// Ravyn — Modal Components (Redesigned)
// Theme-aware, animated, celebratory

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Pressable,
    Animated,
    Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import PressableScale from './PressableScale';
import { spacing, borderRadius, typography, shadows, animations } from '../theme';
import { BOOST_CONFIG } from '../types';

const { width } = Dimensions.get('window');

// ─── Animated Modal Wrapper ──────────────────────────

function AnimatedModal({
    visible,
    onClose,
    children,
}: {
    visible: boolean;
    onClose?: () => void;
    children: React.ReactNode;
}) {
    const { colors } = useTheme();
    const scaleAnim = useRef(new Animated.Value(0.85)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    damping: 16,
                    stiffness: 180,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            scaleAnim.setValue(0.85);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, { backgroundColor: colors.overlay, opacity: opacityAnim }]}>
                <Pressable style={styles.overlayTouchable} onPress={onClose}>
                    <Pressable>
                        <Animated.View
                            style={[
                                styles.modalCard,
                                {
                                    backgroundColor: colors.surfaceElevated,
                                    borderColor: colors.border,
                                    transform: [{ scale: scaleAnim }],
                                    opacity: opacityAnim,
                                },
                                shadows.lg,
                            ]}
                        >
                            {children}
                        </Animated.View>
                    </Pressable>
                </Pressable>
            </Animated.View>
        </Modal>
    );
}

// ─── Boost Modal ──────────────────────────────────────

interface BoostModalProps {
    visible: boolean;
    boostCount: number;
    streak: number | null;
    onAccept: () => void;
    onDecline: () => void;
}

export function BoostModal({
    visible,
    boostCount,
    streak,
    onAccept,
    onDecline,
}: BoostModalProps) {
    const { colors } = useTheme();

    return (
        <AnimatedModal visible={visible}>
            <Ionicons name="flash" size={48} color={colors.boost} style={{ marginBottom: spacing.lg }} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Your streak is at risk
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                You didn't close any tasks yesterday.
            </Text>

            <View style={[styles.streakCallout, { backgroundColor: colors.overlayLight, borderColor: colors.border }]}>
                <Text style={[styles.streakNumber, { color: colors.streak }]}>
                    {streak}
                </Text>
                <Text style={[styles.streakWord, { color: colors.textSecondary }]}>
                    day streak
                </Text>
            </View>

            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                Use a Boost token to protect it?
            </Text>

            <Text style={[styles.tokenInfo, { color: colors.boost }]}>
                {boostCount} Boost{boostCount !== 1 ? 's' : ''} available
            </Text>

            <PressableScale
                onPress={onAccept}
                scaleTo={0.96}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
                <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                    ⚡ Use Boost
                </Text>
            </PressableScale>

            <TouchableOpacity
                style={styles.ghostButton}
                onPress={onDecline}
                activeOpacity={0.6}
            >
                <Text style={[styles.ghostButtonText, { color: colors.textMuted }]}>
                    Let it reset
                </Text>
            </TouchableOpacity>
        </AnimatedModal>
    );
}

// ─── Integrity Explainer Modal ────────────────────────

interface IntegrityModalProps {
    visible: boolean;
    points: number;
    accumulated: number;
    boostTokens: number;
    onClose: () => void;
}

export function IntegrityModal({
    visible,
    points,
    accumulated,
    boostTokens,
    onClose,
}: IntegrityModalProps) {
    const { colors } = useTheme();
    const progress = accumulated / BOOST_CONFIG.THRESHOLD;
    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            progressAnim.setValue(0);
            Animated.timing(progressAnim, {
                toValue: progress,
                duration: 800,
                useNativeDriver: false,
            }).start();
        }
    }, [visible, progress]);

    const Row = ({ label, value, positive }: { label: string; value: string; positive: boolean }) => (
        <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
            <Text style={[styles.rowValue, { color: positive ? colors.success : colors.danger }]}>
                {value}
            </Text>
        </View>
    );

    return (
        <AnimatedModal visible={visible} onClose={onClose}>
            <Ionicons name="shield-checkmark" size={48} color={colors.integrity} style={{ marginBottom: spacing.lg }} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Integrity Points
            </Text>

            <View style={[styles.pointsDisplay, { backgroundColor: colors.overlayLight, borderColor: colors.border }]}>
                <Text style={[styles.pointsNumber, { color: colors.integrity }]}>
                    {points}
                </Text>
                <Text style={[styles.pointsWord, { color: colors.textMuted }]}>total points</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Earn</Text>
            <Row label="Close on time" value="+10" positive />
            <Row label="Close late (≤12h)" value="+4" positive />
            <Row label="Close overdue" value="+2" positive />
            <Row label="Daily close bonus" value="+3" positive />
            <Row label="Clean day" value="+5" positive />

            <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginTop: spacing.md }]}>
                Costs
            </Text>
            <Row label="Overdue at end of day" value="−1 ea" positive={false} />
            <Row label="Extra reschedules" value="−2 ea" positive={false} />
            <Row label="Delete overdue" value="−3" positive={false} />

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Next Boost</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.overlayLight }]}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            backgroundColor: colors.boost,
                            width: progressAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
            </View>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {accumulated} / {BOOST_CONFIG.THRESHOLD}
                {boostTokens >= BOOST_CONFIG.MAX_TOKENS ? ' • Max reached' : ''}
            </Text>

            <TouchableOpacity
                style={[styles.dismissButton, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
            >
                <Text style={[styles.dismissText, { color: colors.textPrimary }]}>Got it</Text>
            </TouchableOpacity>
        </AnimatedModal>
    );
}

// ─── Milestone Celebration Modal ──────────────────────

interface MilestoneModalProps {
    visible: boolean;
    milestone: number;
    onClose: () => void;
}

const milestoneData: Record<number, { emoji: string; title: string; body: string }> = {
    0: {
        emoji: '🌱',
        title: 'First one done.',
        body: 'Every streak starts with a single closure. That was yours.',
    },
    7: {
        emoji: '🎉',
        title: 'One week!',
        body: 'Seven days of showing up. You\'re building something real.',
    },
    30: {
        emoji: '🏆',
        title: 'A full month.',
        body: 'Thirty days of consistency — you\'ve proven that discipline is a muscle.',
    },
    90: {
        emoji: '👑',
        title: 'Ninety days.',
        body: 'Three months. Most people never get here. You did.',
    },
};

export function MilestoneModal({ visible, milestone, onClose }: MilestoneModalProps) {
    const { colors } = useTheme();
    const data = milestoneData[milestone] ?? {
        emoji: '🎯',
        title: `${milestone} days!`,
        body: 'Incredible consistency.',
    };

    // Confetti-like particle animation
    const particles = useRef(
        Array.from({ length: 6 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
        }))
    ).current;

    useEffect(() => {
        if (visible) {
            particles.forEach((p, i) => {
                const angle = (i / 6) * Math.PI * 2;
                const distance = 60 + Math.random() * 40;
                Animated.sequence([
                    Animated.delay(200 + i * 80),
                    Animated.parallel([
                        Animated.spring(p.scale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }),
                        Animated.timing(p.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
                        Animated.timing(p.x, { toValue: Math.cos(angle) * distance, duration: 600, useNativeDriver: true }),
                        Animated.timing(p.y, { toValue: Math.sin(angle) * distance, duration: 600, useNativeDriver: true }),
                    ]),
                    Animated.timing(p.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
                ]).start();
            });
        } else {
            particles.forEach((p) => {
                p.x.setValue(0);
                p.y.setValue(0);
                p.opacity.setValue(0);
                p.scale.setValue(0);
            });
        }
    }, [visible]);

    const sparkleEmojis = ['✨', '⭐', '🌟', '💫', '🔥', '⚡'];

    return (
        <AnimatedModal visible={visible} onClose={onClose}>
            <View style={styles.milestoneEmojiContainer}>
                <Text style={styles.milestoneEmoji}>{data.emoji}</Text>
                {particles.map((p, i) => (
                    <Animated.Text
                        key={i}
                        style={[
                            styles.particle,
                            {
                                opacity: p.opacity,
                                transform: [
                                    { translateX: p.x },
                                    { translateY: p.y },
                                    { scale: p.scale },
                                ],
                            },
                        ]}
                    >
                        {sparkleEmojis[i]}
                    </Animated.Text>
                ))}
            </View>

            <Text style={[styles.milestoneTitle, { color: colors.accent }]}>
                {data.title}
            </Text>
            <Text style={[styles.milestoneBody, { color: colors.textSecondary }]}>
                {data.body}
            </Text>

            <PressableScale
                onPress={onClose}
                scaleTo={0.96}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
                <Text style={[styles.primaryButtonText, { color: colors.primaryContrast }]}>
                    Keep going
                </Text>
            </PressableScale>
        </AnimatedModal>
    );
}

// ─── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayTouchable: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        padding: spacing.xl,
    },
    modalCard: {
        borderRadius: borderRadius.xxl,
        padding: spacing.xl + spacing.sm,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderWidth: 1,
    },
    modalEmoji: {
        fontSize: 44,
        marginBottom: spacing.lg,
    },
    modalTitle: {
        ...typography.headlineLarge,
        textAlign: 'center',
    },
    modalSubtitle: {
        ...typography.bodyMedium,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    modalBody: {
        ...typography.bodyMedium,
        textAlign: 'center',
        lineHeight: 22,
        marginTop: spacing.md,
    },
    streakCallout: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: spacing.sm,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginVertical: spacing.lg,
    },
    streakNumber: {
        fontFamily: 'Georgia',
        fontSize: 36,
        fontWeight: '700',
    },
    streakWord: {
        ...typography.bodyMedium,
    },
    tokenInfo: {
        ...typography.caption,
        fontWeight: '600',
        marginBottom: spacing.lg,
    },
    pointsDisplay: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xxl,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginVertical: spacing.md,
    },
    pointsNumber: {
        fontFamily: 'Georgia',
        fontSize: 32,
        fontWeight: '700',
    },
    pointsWord: {
        ...typography.caption,
        marginTop: 2,
    },
    divider: {
        width: '100%',
        height: StyleSheet.hairlineWidth,
        marginVertical: spacing.lg,
    },
    sectionLabel: {
        ...typography.headlineSmall,
        alignSelf: 'flex-start',
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingVertical: spacing.xs + 1,
    },
    rowLabel: {
        ...typography.bodySmall,
    },
    rowValue: {
        ...typography.bodySmall,
        fontWeight: '700',
    },
    progressBar: {
        width: '100%',
        height: 6,
        borderRadius: 3,
        marginTop: spacing.sm,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressLabel: {
        ...typography.caption,
        marginTop: spacing.xs,
        alignSelf: 'center',
    },
    primaryButton: {
        width: '100%',
        paddingVertical: spacing.md + 2,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    primaryButtonText: {
        ...typography.headlineSmall,
        fontWeight: '600',
    },
    ghostButton: {
        width: '100%',
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginTop: spacing.xs,
    },
    ghostButtonText: {
        ...typography.bodyMedium,
    },
    dismissButton: {
        width: '100%',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        alignItems: 'center',
        marginTop: spacing.lg,
    },
    dismissText: {
        ...typography.bodyMedium,
        fontWeight: '600',
    },
    milestoneEmojiContainer: {
        position: 'relative',
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    milestoneEmoji: {
        fontSize: 56,
    },
    particle: {
        position: 'absolute',
        fontSize: 18,
    },
    milestoneTitle: {
        ...typography.displayMedium,
        textAlign: 'center',
    },
    milestoneBody: {
        ...typography.bodyLarge,
        textAlign: 'center',
        marginTop: spacing.md,
        lineHeight: 25,
        paddingHorizontal: spacing.sm,
    },
});
