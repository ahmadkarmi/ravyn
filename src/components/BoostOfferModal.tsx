// Ravyn — Boost Offer Modal
// Shown when processDays detects a missed day and the user has boost tokens available.
// Prompts the user to either spend a token (save streak) or accept the streak reset.

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';
import { BOOST_CONFIG } from '../types';

interface BoostOfferModalProps {
    visible: boolean;
    streak: number;
    boostTokens: number;
    onUseBoost: () => void;
    onDecline: () => void;
}

export default function BoostOfferModal({
    visible,
    streak,
    boostTokens,
    onUseBoost,
    onDecline,
}: BoostOfferModalProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(60)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
                Animated.spring(cardSlide, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();
        } else {
            backdropOpacity.setValue(0);
            cardSlide.setValue(60);
            cardOpacity.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const tokensAfter = boostTokens - 1;

    return (
        <Modal visible={visible} animationType="none" transparent statusBarTranslucent>
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}
            />

            {/* Card */}
            <View style={[styles.container, { paddingBottom: insets.bottom + spacing.xl }]}>
                <Animated.View
                    style={[
                        styles.card,
                        shadows.lg,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: cardOpacity,
                            transform: [{ translateY: cardSlide }],
                        },
                    ]}
                >
                    {/* Icon cluster */}
                    <View style={styles.iconCluster}>
                        <View style={[styles.flameRing, { backgroundColor: colors.streak + '18', borderColor: colors.streak + '40' }]}>
                            <Ionicons name="flame" size={38} color={colors.streak} />
                        </View>
                        <View style={[styles.boostBadge, { backgroundColor: colors.boost, borderColor: colors.card }]}>
                            <Ionicons name="flash" size={14} color="#FFF" />
                        </View>
                    </View>

                    {/* Headline */}
                    <Text style={[styles.headline, { color: colors.textPrimary }]}>
                        Protect your streak
                    </Text>
                    <Text style={[styles.streakCount, { color: colors.streak }]}>
                        {streak}-day streak
                    </Text>
                    <Text style={[styles.body, { color: colors.textSecondary }]}>
                        You missed a day and your streak is about to reset to zero. Spend 1 Boost to keep it alive.
                    </Text>

                    {/* Token display */}
                    <View style={[styles.tokenRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        {Array.from({ length: BOOST_CONFIG.MAX_TOKENS }, (_, i) => {
                            const isActive = i < boostTokens;
                            const willConsume = i === boostTokens - 1;
                            return (
                                <View key={i} style={styles.tokenItem}>
                                    <View
                                        style={[
                                            styles.tokenCircle,
                                            {
                                                backgroundColor: isActive ? colors.boost + '20' : 'transparent',
                                                borderColor: willConsume ? colors.boost : isActive ? colors.boost + '80' : colors.border,
                                                borderStyle: willConsume ? 'dashed' : 'solid',
                                            },
                                        ]}
                                    >
                                        <Ionicons
                                            name={isActive ? 'flash' : 'flash-outline'}
                                            size={16}
                                            color={isActive ? colors.boost : colors.textMuted + '40'}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                        <Text style={[styles.tokenLabel, { color: colors.textMuted }]}>
                            {boostTokens} token{boostTokens !== 1 ? 's' : ''} available
                            {tokensAfter > 0 ? `. ${tokensAfter} remaining after.` : '. Last one.'}
                        </Text>
                    </View>

                    {/* Primary action */}
                    <TouchableOpacity
                        style={[styles.useBoostBtn, { backgroundColor: colors.boost }]}
                        onPress={onUseBoost}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="flash" size={20} color="#FFF" />
                        <Text style={styles.useBoostText}>Spend 1 Boost, Keep My Streak</Text>
                    </TouchableOpacity>

                    {/* Secondary: decline */}
                    <TouchableOpacity
                        style={[styles.declineBtn, { borderColor: colors.border }]}
                        onPress={onDecline}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.declineText, { color: colors.textMuted }]}>
                            No thanks, let it reset to zero
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.lg,
    },
    card: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.xl,
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCluster: {
        position: 'relative',
        marginBottom: spacing.xs,
    },
    flameRing: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boostBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headline: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    streakCount: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
        marginTop: -spacing.xs,
    },
    body: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: spacing.md,
    },
    tokenRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        alignSelf: 'stretch',
    },
    tokenItem: {
        alignItems: 'center',
    },
    tokenCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tokenLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginLeft: spacing.xs,
        flex: 1,
    },
    useBoostBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        alignSelf: 'stretch',
    },
    useBoostText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    declineBtn: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    declineText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
