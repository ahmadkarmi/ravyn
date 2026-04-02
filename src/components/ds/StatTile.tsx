import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, borderRadius } from '../../theme';

const RING_SIZE = 34;
const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface StatTileProps {
    color: string;
    icon: React.ComponentProps<typeof Ionicons>['name'];
    value: string | number;
    label: string;
    subtitle?: string;
    progress?: number;
    progressRing?: number;
    onPress?: () => void;
}

export function StatTile({ color, icon, value, label, subtitle, progress, progressRing, onPress }: StatTileProps) {
    const { colors } = useTheme();
    const clampedProgress = progress != null ? Math.min(1, Math.max(0, progress)) : undefined;
    const clampedRing = progressRing != null ? Math.min(1, Math.max(0, progressRing)) : undefined;

    const tile = (
        <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {onPress && (
                <View style={styles.infoIndicator}>
                    <Ionicons name="information-circle-outline" size={10} color={colors.textMuted} />
                </View>
            )}
            <View style={styles.tileContent}>
                {clampedRing != null ? (
                    <View style={styles.ringWrap}>
                        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringAbsolute}>
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={colors.border}
                                strokeWidth={2.5}
                                fill="none"
                            />
                            <Circle
                                cx={RING_SIZE / 2}
                                cy={RING_SIZE / 2}
                                r={RING_RADIUS}
                                stroke={color}
                                strokeWidth={2.5}
                                fill="none"
                                strokeDasharray={RING_CIRCUMFERENCE}
                                strokeDashoffset={RING_CIRCUMFERENCE * (1 - clampedRing)}
                                strokeLinecap="round"
                                rotation={-90}
                                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                            />
                        </Svg>
                        <Ionicons name={icon} size={14} color={color} />
                    </View>
                ) : (
                    <Ionicons name={icon} size={14} color={color} />
                )}
                <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
                {subtitle ? (
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
                ) : null}
            </View>
            {clampedProgress != null && (
                <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[styles.progressFill, { backgroundColor: color, width: `${clampedProgress * 100}%` }]} />
                </View>
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.7 }]}
                accessibilityRole="button"
                accessibilityLabel={`${label}: ${value}`}
            >
                {tile}
            </Pressable>
        );
    }

    return <View style={styles.wrapper} accessibilityLabel={`${label}: ${value}`}>{tile}</View>;
}

interface TileGridProps {
    children: React.ReactNode;
}

export function TileGrid({ children }: TileGridProps) {
    return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    wrapper: {
        flex: 1,
        minWidth: 0,
        alignSelf: 'stretch',
    },
    tile: {
        flex: 1,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        overflow: 'hidden',
        alignItems: 'stretch',
    },
    tileContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingTop: spacing.sm,
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
    },
    value: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 20,
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    progressTrack: {
        height: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    infoIndicator: {
        position: 'absolute',
        top: 5,
        right: 5,
    },
    subtitle: {
        fontSize: 9,
        fontWeight: '500',
        letterSpacing: 0.2,
        opacity: 0.6,
        textAlign: 'center',
    },
    ringWrap: {
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ringAbsolute: {
        position: 'absolute',
    },
});
