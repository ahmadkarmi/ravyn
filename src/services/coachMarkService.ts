// Ravyn — Coach Mark Persistence Service
// Tracks which tooltips/coach marks have been shown to the user

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@ravyn/coachmark/';

export async function hasBeenShown(markId: string): Promise<boolean> {
    const val = await AsyncStorage.getItem(PREFIX + markId);
    return val === 'true';
}

export async function markAsShown(markId: string): Promise<void> {
    await AsyncStorage.setItem(PREFIX + markId, 'true');
}

export async function resetAll(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const coachKeys = keys.filter((k) => k.startsWith(PREFIX));
    if (coachKeys.length > 0) await AsyncStorage.multiRemove(coachKeys);
}

// Known coach mark IDs
export const MARKS = {
    STATS_BAR: 'stats_bar',
    SWIPE_TASK: 'swipe_task',
    ADD_BUTTON: 'add_button',
} as const;
