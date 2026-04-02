import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';

export type ChipSize = 'sm' | 'md';
export type ChipVariant = 'tinted' | 'solid';

interface ChipProps {
    color: string;
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    value?: string | number;
    label?: string;
    variant?: ChipVariant;
    size?: ChipSize;
    style?: StyleProp<ViewStyle>;
    onPress?: () => void;
}

const TINT_HEX = '14';

export function Chip({
    color,
    icon,
    value,
    label,
    variant = 'tinted',
    size = 'md',
    style,
    onPress,
}: ChipProps) {
    const isSm = size === 'sm';
    const bg = variant === 'solid' ? color : color + TINT_HEX;
    const fg = variant === 'solid' ? '#FFFFFF' : color;

    const chipStyle = [
        styles.base,
        {
            backgroundColor: bg,
            paddingVertical: isSm ? spacing.xs : spacing.xs + spacing['2xs'],
            paddingHorizontal: isSm ? spacing.sm : spacing.md,
        },
        style,
    ];

    const content = (
        <>
            {icon && <Ionicons name={icon} size={isSm ? 11 : 13} color={fg} />}
            {value !== undefined && (
                <Text style={[styles.value, { color: fg, fontSize: isSm ? 12 : 14 }]}>
                    {value}
                </Text>
            )}
            {label && (
                <Text style={[styles.label, { color: fg, fontSize: isSm ? 10 : 11 }]}>
                    {label}
                </Text>
            )}
        </>
    );

    if (onPress) {
        return (
            <Pressable onPress={onPress} style={({ pressed }) => [chipStyle, pressed && { opacity: 0.7 }]}>
                {content}
            </Pressable>
        );
    }

    return <View style={chipStyle}>{content}</View>;
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    value: {
        fontWeight: '700',
    },
    label: {
        fontWeight: '500',
    },
});
