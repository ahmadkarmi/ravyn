// Ravyn — Boost Tokens Display (InfoSheet Visual)
// Shows 3 token circles: filled for active, outline for inactive.
// Rendered inside InfoSheet's headerVisual slot.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme';
import { BOOST_CONFIG } from '../types';

interface BoostTokensProps {
    tokens: number;
}

export default function BoostTokens({ tokens }: BoostTokensProps) {
    const { colors } = useTheme();
    const bolts = Array.from({ length: BOOST_CONFIG.MAX_TOKENS }, (_, i) => i < tokens);

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
                {bolts.map((active, i) => (
                    <View key={i} style={styles.tokenCol}>
                        <View
                            style={[
                                styles.circle,
                                {
                                    backgroundColor: active ? colors.boost + '20' : 'transparent',
                                    borderColor: active ? colors.boost : colors.border,
                                },
                            ]}
                        >
                            <Ionicons
                                name={active ? 'flash' : 'flash-outline'}
                                size={18}
                                color={active ? colors.boost : colors.textMuted + '40'}
                            />
                        </View>
                        <Text style={[styles.tokenLabel, { color: active ? colors.boost : colors.textMuted }]}>
                            {active ? 'Ready' : 'Empty'}
                        </Text>
                    </View>
                ))}
            </View>
            <Text style={[styles.summary, { color: colors.textMuted }]}>
                {tokens} of {BOOST_CONFIG.MAX_TOKENS} boosts available
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: spacing.xl,
        marginBottom: spacing.sm,
    },
    tokenCol: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    circle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    tokenLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    summary: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
});
