// Ravyn — Weekly Trends
// 7-day mini bar chart showing daily closures, with average line.
// Fits the design system: Card-based, theme-aware, compact.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { format, subDays } from 'date-fns';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../theme';

interface WeeklyTrendsProps {
    closedByDate: Record<string, number>;
}

export default function WeeklyTrends({ closedByDate }: WeeklyTrendsProps) {
    const { colors } = useTheme();

    const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const key = format(date, 'yyyy-MM-dd');
        return {
            key,
            label: format(date, 'EEE').charAt(0),
            fullLabel: format(date, 'EEE'),
            count: closedByDate[key] ?? 0,
            isToday: i === 6,
        };
    });

    const maxCount = Math.max(...days.map((d) => d.count), 1);
    const total = days.reduce((sum, d) => sum + d.count, 0);
    const avg = total / 7;
    const BAR_MAX_HEIGHT = 64;

    return (
        <View>
            {/* Summary row */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{total}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>closed</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{avg.toFixed(1)}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>avg/day</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{days[6].count}</Text>
                    <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>today</Text>
                </View>
            </View>

            {/* Bar chart */}
            <View style={styles.chartRow}>
                {days.map((day) => {
                    const barHeight = day.count > 0
                        ? Math.max((day.count / maxCount) * BAR_MAX_HEIGHT, 4)
                        : 4;

                    return (
                        <View key={day.key} style={styles.barCol}>
                            <Text style={[styles.barValue, { color: day.count > 0 ? colors.textSecondary : colors.textMuted }]}>
                                {day.count > 0 ? day.count : ''}
                            </Text>
                            <View style={styles.barTrack}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: barHeight,
                                            backgroundColor: day.isToday
                                                ? colors.primary
                                                : day.count > 0
                                                    ? colors.success
                                                    : colors.border,
                                            borderRadius: 3,
                                        },
                                    ]}
                                />
                            </View>
                            <Text style={[
                                styles.barLabel,
                                {
                                    color: day.isToday ? colors.primary : colors.textMuted,
                                    fontWeight: day.isToday ? '700' : '400',
                                },
                            ]}>
                                {day.label}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.lg,
        marginBottom: spacing.lg,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    summaryLabel: {
        ...typography.caption,
        marginTop: 2,
    },
    summaryDivider: {
        width: 1,
        height: 28,
        opacity: 0.5,
    },
    chartRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: spacing.xs,
    },
    barCol: {
        flex: 1,
        alignItems: 'center',
    },
    barValue: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
        height: 14,
    },
    barTrack: {
        width: '100%',
        height: 64,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: '70%',
        minWidth: 8,
        maxWidth: 28,
    },
    barLabel: {
        fontSize: 11,
        marginTop: 6,
    },
});
