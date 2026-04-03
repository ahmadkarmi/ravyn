import React, { useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, spacing } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: React.ComponentProps<typeof Ionicons>['name'];
    iconPosition?: 'left' | 'right';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
}

const SIZE = {
    sm: { paddingVertical: spacing.xs + 2,  paddingHorizontal: spacing.md,  fontSize: 13, iconSize: 14, radius: borderRadius.md  },
    md: { paddingVertical: spacing.md,       paddingHorizontal: spacing.lg,  fontSize: 15, iconSize: 16, radius: borderRadius.lg  },
    lg: { paddingVertical: spacing.md + 4,   paddingHorizontal: spacing.xl,  fontSize: 17, iconSize: 18, radius: borderRadius.xl  },
} as const;

export function Button({
    label,
    onPress,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
}: ButtonProps) {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    const s = SIZE[size];

    const handlePress = () => {
        if (disabled || loading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
    };

    const handlePressIn = () => {
        Animated.spring(scale, {
            toValue: 0.96,
            damping: 14,
            stiffness: 400,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scale, {
            toValue: 1,
            damping: 12,
            stiffness: 300,
            useNativeDriver: true,
        }).start();
    };

    const variantStyles = resolveVariant(variant, colors);
    const isDisabled = disabled || loading;

    return (
        <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }, style]}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ disabled: isDisabled, busy: loading }}
                style={[
                    styles.base,
                    {
                        paddingVertical: s.paddingVertical,
                        paddingHorizontal: s.paddingHorizontal,
                        borderRadius: s.radius,
                        backgroundColor: variantStyles.bg,
                        borderColor: variantStyles.border,
                        borderWidth: variantStyles.borderWidth,
                        opacity: isDisabled ? 0.45 : 1,
                    },
                    fullWidth && styles.fullWidth,
                ]}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={variantStyles.fg} />
                ) : (
                    <View style={styles.inner}>
                        {icon && iconPosition === 'left' && (
                            <Ionicons name={icon} size={s.iconSize} color={variantStyles.fg} />
                        )}
                        <Text style={[styles.label, { color: variantStyles.fg, fontSize: s.fontSize }]}>
                            {label}
                        </Text>
                        {icon && iconPosition === 'right' && (
                            <Ionicons name={icon} size={s.iconSize} color={variantStyles.fg} />
                        )}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

function resolveVariant(variant: ButtonVariant, colors: ReturnType<typeof useTheme>['colors']) {
    switch (variant) {
        case 'primary':
            return { bg: colors.primary, fg: colors.primaryContrast, border: 'transparent', borderWidth: 0 };
        case 'secondary':
            return { bg: colors.primaryMuted, fg: colors.primary, border: 'transparent', borderWidth: 0 };
        case 'ghost':
            return { bg: 'transparent', fg: colors.textPrimary, border: colors.border, borderWidth: 1 };
        case 'destructive':
            return { bg: colors.danger, fg: '#FFFFFF', border: 'transparent', borderWidth: 0 };
    }
}

const styles = StyleSheet.create({
    base: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    inner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    label: {
        fontWeight: '600',
    },
    fullWidth: {
        width: '100%',
    },
});
