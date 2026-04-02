// PressableScale — Animated press-scale wrapper
// Drop-in replacement for TouchableOpacity when physical press feedback is needed

import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

interface PressableScaleProps {
    onPress?: () => void;
    onLongPress?: () => void;
    style?: StyleProp<ViewStyle>;
    pressStyle?: StyleProp<ViewStyle>;
    scaleTo?: number;
    children: React.ReactNode;
    disabled?: boolean;
    hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
    activeOpacity?: number;
    accessibilityRole?: 'button' | 'link' | 'none';
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

export default function PressableScale({
    onPress,
    onLongPress,
    style,
    pressStyle,
    scaleTo = 0.94,
    children,
    disabled,
    hitSlop,
    accessibilityRole = 'button',
    accessibilityLabel,
    accessibilityHint,
}: PressableScaleProps) {
    const scale = useRef(new Animated.Value(1)).current;

    const pressIn = () =>
        Animated.spring(scale, {
            toValue: scaleTo,
            damping: 20,
            stiffness: 500,
            useNativeDriver: true,
        }).start();

    const pressOut = () =>
        Animated.spring(scale, {
            toValue: 1,
            damping: 14,
            stiffness: 300,
            useNativeDriver: true,
        }).start();

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={pressIn}
            onPressOut={pressOut}
            disabled={disabled}
            hitSlop={hitSlop}
            accessibilityRole={accessibilityRole}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            style={pressStyle as any}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}
