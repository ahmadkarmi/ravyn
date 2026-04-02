// Ravyn — Notification Service (Native)
// Three daily notifications:
//   1. Morning  — start of day: plan & review tasks
//   2. Midday   — only if open tasks exist: progress nudge
//   3. Evening  — end of day: wrap up & prep tomorrow

import * as Notifications from 'expo-notifications';
import { getUserState } from './integrityService';
import { getAllTasks } from './taskService';

// ─── Setup ────────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ─── Permissions ──────────────────────────────────────

export async function requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

export async function hasPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}

// ─── Helpers ──────────────────────────────────────────

function parseTime(timeStr: string): { hours: number; minutes: number } {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: isNaN(h) ? 8 : h, minutes: isNaN(m) ? 0 : m };
}

function midpoint(start: { hours: number; minutes: number }, end: { hours: number; minutes: number }): { hours: number; minutes: number } {
    const startMins = start.hours * 60 + start.minutes;
    const endMins   = end.hours   * 60 + end.minutes;
    const midMins   = Math.floor((startMins + endMins) / 2);
    return { hours: Math.floor(midMins / 60), minutes: midMins % 60 };
}

// ─── Content Collections ──────────────────────────────

const MORNING_TITLES = [
    "Your day is waiting, let's go 🚀",
    "Time to set the pace ☀️",
    "What's the plan today? 🎯",
    "A new day, a clean slate ✨",
    "Ready to close some tasks? 🔥"
];

const MIDDAY_TITLES = [
    "Get it done ⚡",
    "Keep the momentum alive 🏃‍♂️",
    "Halfway there, keep pushing ⏱️",
    "Don't lose your streak 🔥",
    "Time for a quick win 🎯"
];

const EVENING_TITLES = [
    "Before you call it a day 🌙",
    "Time to wrap things up 🏁",
    "How did today go? 📊",
    "Set yourself up for tomorrow 🌅",
    "One last check-in 🦉"
];

const MORNING_BODIES = [
    "Open Ravyn, review what's on your plate, add anything new, and set yourself up to win today.",
    "Take 60 seconds to plan. What's the one thing that must get done today?",
    "A quick review now saves hours later. Lock in your priorities.",
    "Decide what matters today. Everything else can wait or be rescheduled.",
    "Start strong. Review your open tasks and make a realistic plan."
];

const MIDDAY_BODIES_DYNAMIC = (countPhrase: string) => [
    `You still have ${countPhrase} today. Close even one to keep the momentum alive.`,
    `${countPhrase} waiting. Can you knock one out before your next break?`,
    `Half the day is gone. Knock out one of your ${countPhrase} now.`,
    `Don't let your ${countPhrase} roll over. Close one and build the habit.`,
    `Progress > perfection. Pick one of your ${countPhrase} and just start.`
];

const EVENING_BODIES = [
    "Mark what you closed, reschedule anything still open, and plan tomorrow before the window shuts.",
    "Clear your mind. Check off what's done and move the rest to tomorrow.",
    "How did you do? Close out today's list and start fresh in the morning.",
    "Don't leave tasks hanging. Reschedule what you missed and protect your streak.",
    "Wrap it up. A clean slate tomorrow starts with a solid check-in tonight."
];

function getRandomItem(items: string[]): string {
    return items[Math.floor(Math.random() * items.length)];
}

// ─── Core Scheduler ───────────────────────────────────

/**
 * Cancels all existing daily notifications and reschedules them.
 * @param openTaskCount  Pass the number of currently open/overdue tasks.
 *                       If > 0, a midday reminder is included.
 *                       If undefined the midday notification is always scheduled
 *                       (safe default when task state is not available at call site).
 */
export async function scheduleDailyNotifications(openTaskCount?: number): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const canNotify = await hasPermission();
    if (!canNotify) return;

    const state = await getUserState();
    const start = parseTime(state.startOfDay);
    const end   = parseTime(state.endOfDay);
    const mid   = midpoint(start, end);

    // 1. Morning — start of day: plan your day
    await Notifications.scheduleNotificationAsync({
        content: {
            title: getRandomItem(MORNING_TITLES),
            body: getRandomItem(MORNING_BODIES),
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: start.hours,
            minute: start.minutes,
        },
    });

    // 2. Midday — only when there are open tasks
    const scheduleMidday = openTaskCount === undefined || openTaskCount > 0;
    if (scheduleMidday) {
        const taskWord = openTaskCount === 1 ? 'task' : 'tasks';
        const countPhrase = openTaskCount !== undefined
            ? `${openTaskCount} open ${taskWord}`
            : 'open tasks';
        await Notifications.scheduleNotificationAsync({
            content: {
                title: getRandomItem(MIDDAY_TITLES),
                body: getRandomItem(MIDDAY_BODIES_DYNAMIC(countPhrase)),
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: mid.hours,
                minute: mid.minutes,
            },
        });
    }

    // 3. End of day — wrap up and prep tomorrow
    await Notifications.scheduleNotificationAsync({
        content: {
            title: getRandomItem(EVENING_TITLES),
            body: getRandomItem(EVENING_BODIES),
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: end.hours,
            minute: end.minutes,
        },
    });
}

/**
 * Loads the current task state and reschedules all daily notifications
 * accordingly. Call this on app focus so the midday notification stays
 * in sync with whether the user actually has open tasks.
 */
export async function refreshDailyNotifications(): Promise<void> {
    const canNotify = await hasPermission();
    if (!canNotify) return;

    try {
        const tasks = await getAllTasks();
        const openCount = tasks.filter(
            (t) => t.status === 'open' || t.status === 'overdue',
        ).length;
        await scheduleDailyNotifications(openCount);
    } catch {
        // Non-critical — silently skip if tasks can't be read
    }
}

export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── App Icon Badge ────────────────────────────────────

export async function setBadgeCount(count: number): Promise<void> {
    try {
        await Notifications.setBadgeCountAsync(count);
    } catch {
        // Badge not supported on this platform/config
    }
}

// ─── Task-Specific Reminders ───────────────────────────

/**
 * Schedules a one-time notification for a task on its due date at reminderTime (HH:mm).
 * Returns the notification identifier, or null if scheduling failed.
 */
export async function scheduleTaskReminder(
    taskId: string,
    title: string,
    dueDate: string,
    reminderTime: string,
): Promise<string | null> {
    const canNotify = await hasPermission();
    if (!canNotify) return null;

    try {
        // Build a date from dueDate + reminderTime in local time
        const trigger = new Date(`${dueDate}T${reminderTime}:00`);
        if (isNaN(trigger.getTime()) || trigger <= new Date()) return null;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: '⏰ Task reminder',
                body: title,
                data: { taskId },
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: trigger,
            },
        });
        return id;
    } catch {
        return null;
    }
}

/**
 * Cancels a previously scheduled task reminder by its notification identifier.
 */
export async function cancelTaskReminder(notificationId: string): Promise<void> {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch {
        // Ignore — already cancelled or never existed
    }
}
