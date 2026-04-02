import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius } from '../../theme';
import { layout } from './layout';

export type IconBoxSize = 'sm' | 'md' | 'lg';

interface IconBoxProps {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    color: string;
    size?: IconBoxSize;
    style?: StyleProp<ViewStyle>;
}

const TINT_HEX = '14';

const sizeMap = {
    sm: { box: layout.iconBoxSm, icon: 13, radius: borderRadius.sm },
    md: { box: layout.iconBoxMd, icon: 17, radius: borderRadius.md },
    lg: { box: layout.iconBoxLg, icon: 20, radius: borderRadius.md },
} as const;

export function IconBox({ icon, color, size = 'sm', style }: IconBoxProps) {
    const s = sizeMap[size];

    return (
        <View
            style={[
                {
                    width: s.box,
                    height: s.box,
                    borderRadius: s.radius,
                    backgroundColor: color + TINT_HEX,
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                style,
            ]}
        >
            <Ionicons name={icon} size={s.icon} color={color} />
        </View>
    );
}
