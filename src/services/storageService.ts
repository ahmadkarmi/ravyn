// Ravyn MVP — AsyncStorage Wrapper

import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@ravyn/';

export const StorageKeys = {
    USER_STATE: `${PREFIX}userState`,
    TASKS: `${PREFIX}tasks`,
    TAGS: `${PREFIX}tags`,
    DAILY_RECORDS: `${PREFIX}dailyRecords`,
    INTEGRITY_EVENTS: `${PREFIX}integrityEvents`,
    LAST_SYNC_AT: `${PREFIX}lastSyncAt`,
    HINTS_SEEN: `${PREFIX}hintsSeen`,
    LAST_PUSHED_EVENT_COUNT: `${PREFIX}lastPushedEventCount`,
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.error(`[Storage] Failed to get ${key}:`, error);
        return null;
    }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`[Storage] Failed to set ${key}:`, error);
    }
}

export async function removeItem(key: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(key);
    } catch (error) {
        console.error(`[Storage] Failed to remove ${key}:`, error);
    }
}

export async function clearAll(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const ravynKeys = keys.filter((k) => k.startsWith(PREFIX));
        await AsyncStorage.multiRemove(ravynKeys);
    } catch (error) {
        console.error('[Storage] Failed to clear all:', error);
    }
}
