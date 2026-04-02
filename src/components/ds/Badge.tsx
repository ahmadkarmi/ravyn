import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { spacing, borderRadius } from '../../theme';

interface BadgeProps {
    count: number | string;
    color: string;
    style?: StyleProp<ViewStyle>;
}

const TINT_HEX = '14';

export function Badge({ count, color, style }: BadgeProps) {
    return (
        <View style={[styles.badge, { backgroundColor: color + TINT_HEX }, style]}>
            <Text style={[styles.text, { color }]}>{count}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderRadius: borderRadius.full,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing['2xs'],
        minWidth: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
    },
});
