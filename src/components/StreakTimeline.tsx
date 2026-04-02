// Ravyn — Streak Timeline (InfoSheet Visual)
// 7-day visual with day labels and circles, rendered inside InfoSheet.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme';
import { DailyRecord } from '../types';
import { localDateStr } from '../utils/dateUtils';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface StreakTimelineProps {
    streak: number | null;
    records: Record<string, DailyRecord>;
}

interface DayCell {
    key: string;
    label: string;
    active: boolean;
    isToday: boolean;
}

function buildDays(records: Record<string, DailyRecord>, streak: number | null): DayCell[] {
    const today = new Date();
    const todayKey = localDateStr(today);
    const cells: DayCell[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        const key = localDateStr(d);
        cells.push({
            key,
            label: DAY_LABELS[d.getDay()],
            active: (records[key]?.closedCount ?? 0) > 0,
            isToday: key === todayKey,
        });
    }

    // Reconcile with streak: if streak is N, backfill N consecutive
    // green days ending at the last known active day. This handles
    // cases where a daily record wasn't written for a streak day.
    if (streak && streak > 0) {
        let lastGreenIdx = -1;
        for (let i = cells.length - 1; i >= 0; i--) {
            if (cells[i].active) { lastGreenIdx = i; break; }
        }
        if (lastGreenIdx < 0) lastGreenIdx = cells.length - 1;

        for (let i = 0; i < streak && (lastGreenIdx - i) >= 0; i++) {
            cells[lastGreenIdx - i].active = true;
        }
    }

    return cells;
}

export default function StreakTimeline({ streak, records }: StreakTimelineProps) {
    const { colors } = useTheme();
    const days = buildDays(records, streak);
    const count = streak ?? 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.header}>
                <Text style={{ fontSize: 18 }}>🔥</Text>
                <Text style={[styles.streakNum, { color: colors.textPrimary }]}>{count}</Text>
                <Text style={[styles.streakLabel, { color: colors.textMuted }]}>
                    day{count !== 1 ? 's' : ''} streak
                </Text>
            </View>
            <View style={styles.row}>
                {days.map((day) => (
                    <View key={day.key} style={styles.dayCol}>
                        <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{day.label}</Text>
                        <View
                            style={[
                                styles.circle,
                                {
                                    backgroundColor: day.active ? colors.success : 'transparent',
                                    borderColor: day.isToday && !day.active ? colors.primary : day.active ? colors.success : colors.border,
                                    borderWidth: day.isToday && !day.active ? 2 : 1.5,
                                },
                            ]}
                        >
                            {day.active && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </View>
                        {day.isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: spacing.md,
    },
    streakNum: {
        fontSize: 20,
        fontWeight: '800',
    },
    streakLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayCol: {
        alignItems: 'center',
        gap: 4,
    },
    dayLabel: {
        fontSize: 10,
        fontWeight: '600',
    },
    circle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 1,
    },
});
