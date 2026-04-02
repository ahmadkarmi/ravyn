// Ravyn — App Navigator
// Custom tab bar with pill indicator, proper icons, frosted glass

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Platform,
    Animated,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, shadows } from '../theme';
import * as Haptics from 'expo-haptics';
import * as TaskService from '../services/taskService';
import HomeScreen from '../screens/HomeScreen';
import ReviewDashboardScreen from '../screens/ReviewDashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen from '../screens/ProfileScreen';
const Tab = createBottomTabNavigator();

// ─── Tab icon definitions ──────────────────────────────
interface TabDef {
    label: string;
    iconActive: string;
    iconInactive: string;
}

const TABS: Record<string, TabDef> = {
    Today: {
        label: 'Activity',
        iconActive: 'pulse',
        iconInactive: 'pulse-outline',
    },
    Review: {
        label: 'Review',
        iconActive: 'reader',
        iconInactive: 'reader-outline',
    },
    Calendar: {
        label: 'Calendar',
        iconActive: 'calendar',
        iconInactive: 'calendar-outline',
    },
    Profile: {
        label: 'Profile',
        iconActive: 'person-circle',
        iconInactive: 'person-circle-outline',
    },
};

// ─── Custom Tab Bar ────────────────────────────────────

interface CustomTabBarProps extends BottomTabBarProps {
    overdueCount: number;
}

function CustomTabBar({ state, descriptors, navigation, overdueCount }: CustomTabBarProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const tabAnims = useRef<Animated.Value[]>(
        state.routes.map((_, i) => new Animated.Value(state.index === i ? 1 : 0))
    ).current;

    useEffect(() => {
        tabAnims.forEach((anim, i) => {
            Animated.spring(anim, {
                toValue: state.index === i ? 1 : 0,
                damping: 14,
                stiffness: 280,
                useNativeDriver: true,
            }).start();
        });
    }, [state.index]);

    return (
        <View style={[styles.tabBarOuter, { pointerEvents: 'box-none', paddingBottom: insets.bottom + spacing.sm }]}>
            <View
                style={[
                    styles.tabBarContainer,
                    {
                        backgroundColor: isDark
                            ? 'rgba(26, 26, 28, 0.94)'
                            : 'rgba(255, 255, 255, 0.96)',
                        borderColor: colors.tabBarBorder,
                    },
                    Platform.OS === 'ios' && styles.tabBarBlur,
                    shadows.lg,
                ]}
            >
                <View style={styles.tabBarInner}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;
                    const tab = TABS[route.name] ?? { label: route.name, iconActive: 'ellipse', iconInactive: 'ellipse-outline' };

                    const onPress = () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });
                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    const anim = tabAnims[index];
                    const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
                    const pillOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
                    const pillScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
                    const labelOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

                    return (
                        <TouchableOpacity
                            key={route.key}
                            accessibilityRole="button"
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            onPress={onPress}
                            activeOpacity={0.8}
                            style={styles.tabItem}
                        >
                            {/* Active pill background — animated in/out */}
                            <Animated.View
                                style={[
                                    styles.activePill,
                                    {
                                        backgroundColor: colors.primaryMuted,
                                        opacity: pillOpacity,
                                        transform: [{ scaleX: pillScale }],
                                    },
                                ]}
                            />

                            {/* Icon + badge */}
                            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
                                <View>
                                    <Ionicons
                                        name={(isFocused ? tab.iconActive : tab.iconInactive) as any}
                                        size={19}
                                        color={isFocused ? colors.primary : colors.textMuted}
                                        style={styles.tabIcon}
                                    />
                                    {route.name === 'Review' && overdueCount > 0 && (
                                        <View style={[styles.badgeDot, { backgroundColor: colors.danger }]}>
                                            <Text style={styles.badgeText}>
                                                {overdueCount > 9 ? '9+' : overdueCount}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>

                            {/* Label */}
                            <Animated.Text
                                style={[
                                    styles.tabLabel,
                                    {
                                        color: isFocused ? colors.primary : colors.textMuted,
                                        fontWeight: isFocused ? '700' : '500',
                                        opacity: labelOpacity,
                                    },
                                ]}
                            >
                                {tab.label}
                            </Animated.Text>
                        </TouchableOpacity>
                    );
                })}
                </View>
            </View>
        </View>
    );
}

// ─── Navigator ─────────────────────────────────────────

interface AppNavigatorProps {
    onReset: () => void;
}

export default function AppNavigator({ onReset }: AppNavigatorProps) {
    const [overdueCount, setOverdueCount] = useState(0);

    useFocusEffect(
        useCallback(() => {
            let active = true;
            TaskService.getAllTasks().then((tasks) => {
                if (active) setOverdueCount(tasks.filter((t) => t.status === 'overdue').length);
            });
            return () => { active = false; };
        }, [])
    );

    return (
        <Tab.Navigator
            tabBar={(props) => <CustomTabBar {...props} overdueCount={overdueCount} />}
            screenOptions={{
                headerShown: false,
                animation: 'fade',
            }}
        >
            <Tab.Screen name="Today" component={HomeScreen} />
            <Tab.Screen name="Review" component={ReviewDashboardScreen} />
            <Tab.Screen name="Calendar" component={CalendarScreen} />
            <Tab.Screen name="Profile">
                {() => <ProfileScreen onReset={onReset} />}
            </Tab.Screen>
        </Tab.Navigator>
    );
}

// ─── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
    tabBarOuter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: spacing.lg,
    },
    tabBarContainer: {
        borderWidth: 1,
        borderRadius: borderRadius.xl,
        paddingBottom: Platform.OS === 'ios' ? spacing.md : spacing.sm,
        paddingTop: spacing.sm,
    },
    tabBarBlur: {
        // iOS gets a subtle backdrop blur feel via semi-transparent bg
    },
    tabBarInner: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xs + 2,
        position: 'relative',
    },
    activePill: {
        position: 'absolute',
        top: 2,
        bottom: 0,
        left: spacing.sm,
        right: spacing.sm,
        borderRadius: borderRadius.md,
    },
    tabIcon: {
        marginBottom: 2,
    },
    tabLabel: {
        fontSize: 11,
        letterSpacing: 0.3,
    },
    badgeDot: {
        position: 'absolute',
        top: -4,
        right: -8,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 9,
        fontWeight: '700',
    },
});
