// Ravyn MVP — Notification Service (Web No-op / Fallback)
// Notifications are not supported on web for this version, or use native implementation if available

export async function requestPermissions(): Promise<boolean> {
    return false;
}

export async function hasPermission(): Promise<boolean> {
    return false;
}

export async function scheduleDailyNotifications(_openTaskCount?: number): Promise<void> {
    // No-op on web
}

export async function refreshDailyNotifications(): Promise<void> {
    // No-op on web
}

export async function cancelAllNotifications(): Promise<void> {
    // No-op
}

export async function setBadgeCount(_count: number): Promise<void> {
    // No-op on web
}

export async function scheduleTaskReminder(
    _taskId: string,
    _title: string,
    _dueDate: string,
    _reminderTime: string,
): Promise<string | null> {
    return null;
}

export async function cancelTaskReminder(_notificationId: string): Promise<void> {
    // No-op on web
}
