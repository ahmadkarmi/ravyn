import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { layout } from './layout';

export type CardVariant = 'elevated' | 'filled' | 'outlined';

interface CardProps {
    variant?: CardVariant;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function Card({ variant = 'elevated', children, style }: CardProps) {
    const { colors } = useTheme();

    return (
        <View
            style={[
                {
                    borderRadius: layout.cardRadius,
                    backgroundColor: variant === 'filled' ? colors.surface : colors.card,
                    padding: layout.cardPadding,
                },
                variant === 'elevated' && layout.cardShadow,
                variant === 'outlined' && {
                    borderWidth: layout.hairline,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            {children}
        </View>
    );
}
