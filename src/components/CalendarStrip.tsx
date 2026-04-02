// Ravyn — Horizontal Calendar Strip
// Premium weekly date selector with "squircle" active state.

import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';

interface CalendarStripProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
}

export default function CalendarStrip({ selectedDate, onSelectDate }: CalendarStripProps) {
    const { colors } = useTheme();
    const formattedToday = new Date(); // assuming today is anchor

    // Generate next 14 days? Or +/- 7?
    // Let's do a 2-week sliding window starting from "This Week".
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
    const days = Array.from({ length: 14 }).map((_, i) => addDays(startDate, i));

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {days.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayItem,
                                isSelected && { backgroundColor: colors.primary, ...shadows.md },
                                !isSelected && isToday && { borderColor: colors.primary, borderWidth: 1 }
                            ]}
                            onPress={() => onSelectDate(date)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.dayName,
                                { color: isSelected ? colors.primaryContrast : colors.textSecondary }
                            ]}>
                                {format(date, 'EEE')}
                            </Text>
                            <Text style={[
                                styles.dayNumber,
                                { color: isSelected ? colors.primaryContrast : colors.textPrimary }
                            ]}>
                                {format(date, 'd')}
                            </Text>
                            {isSelected && <View style={styles.dot} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    dayItem: {
        width: 50,
        height: 70,
        borderRadius: borderRadius.xl, // Very rounded "squircle"
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.02)', // Subtle fill
    },
    dayName: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
    },
    dayNumber: {
        fontSize: 18,
        fontWeight: '700',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#fff',
        marginTop: 4,
    },
});
