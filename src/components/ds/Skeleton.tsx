import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius as br } from '../../theme';

interface SkeletonProps {
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
    style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 14, borderRadius = br.md, style }: SkeletonProps) {
    const { colors } = useTheme();
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [shimmer]);

    const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });

    return (
        <Animated.View
            style={[
                { width: width as any, height, borderRadius, backgroundColor: colors.border, opacity },
                style,
            ]}
        />
    );
}

/** Pre-built skeleton that mimics a TaskCard row */
export function TaskCardSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[skStyles.card, { backgroundColor: colors.card }]}>
            <View style={skStyles.row}>
                <Skeleton width={18} height={18} borderRadius={9} />
                <View style={skStyles.body}>
                    <Skeleton width="70%" height={14} />
                    <Skeleton width="40%" height={10} style={{ marginTop: 6 }} />
                </View>
            </View>
        </View>
    );
}

/** Multiple TaskCard skeletons */
export function TaskListSkeleton({ count = 4 }: { count?: number }) {
    return (
        <View style={skStyles.list}>
            {Array.from({ length: count }).map((_, i) => (
                <TaskCardSkeleton key={i} />
            ))}
        </View>
    );
}

/** Skeleton that mimics a StatTile (icon + value + label) */
export function StatTileSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[skStyles.statTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width={14} height={14} borderRadius={7} />
            <Skeleton width={32} height={18} borderRadius={4} style={{ marginTop: 4 }} />
            <Skeleton width={40} height={10} borderRadius={3} style={{ marginTop: 3 }} />
        </View>
    );
}

/** Row of 4 StatTileSkeletons */
export function StatRowSkeleton() {
    return (
        <View style={skStyles.statRow}>
            {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={skStyles.statCell}>
                    <StatTileSkeleton />
                </View>
            ))}
        </View>
    );
}

/** Skeleton that mimics a review task-summary row */
export function ReviewRowSkeleton() {
    const { colors } = useTheme();
    return (
        <View style={[skStyles.reviewRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width={28} height={28} borderRadius={br.sm} />
            <View style={skStyles.reviewBody}>
                <Skeleton width="65%" height={13} />
                <Skeleton width="40%" height={10} style={{ marginTop: 5 }} />
            </View>
            <Skeleton width={36} height={14} borderRadius={br.sm} />
        </View>
    );
}

/** Multiple ReviewRowSkeletons */
export function ReviewListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <View style={skStyles.list}>
            {Array.from({ length: count }).map((_, i) => (
                <ReviewRowSkeleton key={i} />
            ))}
        </View>
    );
}

const skStyles = StyleSheet.create({
    card: {
        borderRadius: br.lg,
        padding: 14,
        marginBottom: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    body: {
        flex: 1,
        gap: 0,
    },
    list: {
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    statTile: {
        flex: 1,
        borderRadius: br.lg,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        gap: 0,
    },
    statRow: {
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
    },
    statCell: {
        flex: 1,
    },
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: br.lg,
        borderWidth: 1,
        padding: 12,
        marginBottom: 8,
    },
    reviewBody: {
        flex: 1,
        gap: 0,
    },
});
