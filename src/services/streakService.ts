// Ravyn MVP — Streak Engine

import { format, subDays, parseISO, differenceInHours } from 'date-fns';
import { UserState, STREAK_MILESTONES, BOOST_CONFIG, INTEGRITY_POINTS } from '../types';
import { getUserState, saveUserState } from './integrityService';
import { getClosedTodayTasks, markOverdueTasks } from './taskService';
import { getItem, setItem, StorageKeys } from './storageService';
import { DailyRecord } from '../types';

// ─── Helpers ───────────────────────────────────────────

function todayStr(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

function yesterdayStr(): string {
    return format(subDays(new Date(), 1), 'yyyy-MM-dd');
}

// ─── Daily Records ────────────────────────────────────

async function loadDailyRecords(): Promise<Record<string, DailyRecord>> {
    return (await getItem<Record<string, DailyRecord>>(StorageKeys.DAILY_RECORDS)) ?? {};
}

async function saveDailyRecord(record: DailyRecord): Promise<void> {
    const records = await loadDailyRecords();
    records[record.date] = record;
    await setItem(StorageKeys.DAILY_RECORDS, records);
}

export async function getDailyRecord(date: string): Promise<DailyRecord | null> {
    const records = await loadDailyRecords();
    return records[date] ?? null;
}

export async function getAllDailyRecords(): Promise<Record<string, DailyRecord>> {
    return loadDailyRecords();
}

// ─── Midnight Processing ─────────────────────────────

export interface ProcessResult {
    streakChanged: boolean;
    newStreak: number | null;
    boostOffered: boolean;
    milestone: number | null;
    dailyRecord: DailyRecord | null;
}

/**
 * Process missed days since last check.
 * Called on app open. Idempotent — safe to call multiple times.
 */
export async function processDays(): Promise<ProcessResult> {
    const state = await getUserState();
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Already processed through yesterday — nothing new to credit
    if (state.lastProcessedDate && state.lastProcessedDate >= yesterday) {
        return {
            streakChanged: false,
            newStreak: state.streak,
            boostOffered: state.pendingBoostOffer,
            milestone: null,
            dailyRecord: null,
        };
    }

    // Mark overdue tasks
    await markOverdueTasks();

    const lastProcessed = state.lastProcessedDate;

    // First ever processing — set baseline to yesterday so tomorrow processes today's closures
    if (!lastProcessed) {
        state.lastProcessedDate = yesterday;
        await saveUserState(state);
        return {
            streakChanged: false,
            newStreak: state.streak,
            boostOffered: false,
            milestone: null,
            dailyRecord: null,
        };
    }

    // Build ordered list of all days to process: from day after lastProcessed up to yesterday (completed days only)
    const daysToProcess: string[] = [];
    let cursor = new Date(lastProcessed + 'T12:00:00');
    const cutoff = yesterday;
    cursor = new Date(cursor.getTime() + 86_400_000); // start from day after lastProcessed
    while (format(cursor, 'yyyy-MM-dd') <= cutoff) {
        daysToProcess.push(format(cursor, 'yyyy-MM-dd'));
        cursor = new Date(cursor.getTime() + 86_400_000);
    }

    let result: ProcessResult = {
        streakChanged: false,
        newStreak: state.streak,
        boostOffered: false,
        milestone: null,
        dailyRecord: null,
    };

    // Process each missed day in chronological order
    for (const day of daysToProcess) {
        const record = await getDailyRecord(day);
        const closedCount = record?.closedCount ?? 0;

        if (closedCount > 0) {
            // Had closures — increment streak
            state.streak = (state.streak ?? 0) + 1;
            state.streakGraceDate = null;
            result.streakChanged = true;
            result.newStreak = state.streak;

            if (STREAK_MILESTONES.includes(state.streak as any)) {
                result.milestone = state.streak;
            }
        } else {
            // No closures this day
            if (state.streak !== null && state.streak > 0) {
                if (!state.pendingBoostOffer && state.boostTokens > 0) {
                    // Offer boost token to save streak (covers exactly this one missed day)
                    state.pendingBoostOffer = true;
                    state.boostOfferTimestamp = new Date().toISOString();
                    result.boostOffered = true;
                } else {
                    // No fresh boost available (none left, or offer already pending for a prior day)
                    // Apply grace or reset — boost offer only protects one missed day
                    if (!state.streakGraceDate) {
                        state.streakGraceDate = day;
                    } else {
                        state.streak = 0;
                        state.streakGraceDate = null;
                        result.streakChanged = true;
                        result.newStreak = 0;
                    }
                }
            }
        }

        // Apply integrity adjustments for this completed day
        const overdueAtEOD = record?.overdueAtEOD ?? 0;
        if (closedCount > 0) {
            state.integrityPoints += INTEGRITY_POINTS.DAILY_BONUS;
            if (overdueAtEOD === 0) {
                state.integrityPoints += INTEGRITY_POINTS.CLEAN_DAY;
            }
        }
        if (overdueAtEOD > 0) {
            const penalty = Math.max(
                overdueAtEOD * INTEGRITY_POINTS.OVERDUE_PENALTY,
                INTEGRITY_POINTS.OVERDUE_PENALTY_CAP,
            );
            state.integrityPoints = Math.max(0, state.integrityPoints + penalty);
        }
        // Auto-convert integrity → boost tokens; reset to 0 on conversion
        while (state.integrityPoints >= BOOST_CONFIG.THRESHOLD && state.boostTokens < BOOST_CONFIG.MAX_TOKENS) {
            state.boostTokens += 1;
            state.integrityPoints = 0;
        }
        if (state.boostTokens >= BOOST_CONFIG.MAX_TOKENS) {
            state.integrityPoints = Math.min(state.integrityPoints, BOOST_CONFIG.THRESHOLD);
        }
    }

    state.lastProcessedDate = yesterday;
    await saveUserState(state);
    return result;
}

// ─── Boost Actions ────────────────────────────────────

export async function useBoost(): Promise<UserState> {
    const state = await getUserState();
    if (state.boostTokens > 0 && state.pendingBoostOffer) {
        const wasAtCap = state.boostTokens >= BOOST_CONFIG.MAX_TOKENS;
        state.boostTokens -= 1;
        state.pendingBoostOffer = false;
        state.boostOfferTimestamp = null;
        // If points were frozen at cap (all slots full), opening a slot resets the counter
        if (wasAtCap) {
            state.integrityPoints = 0;
        }
        await saveUserState(state);
    }
    return state;
}

export async function declineBoost(): Promise<UserState> {
    const state = await getUserState();
    state.pendingBoostOffer = false;
    state.boostOfferTimestamp = null;
    state.streak = 0;
    state.streakGraceDate = null;
    await saveUserState(state);
    return state;
}

export async function checkAutoDeclineBoost(): Promise<boolean> {
    const state = await getUserState();
    if (!state.pendingBoostOffer || !state.boostOfferTimestamp) return false;

    const offeredAt = parseISO(state.boostOfferTimestamp);
    const hoursSince = differenceInHours(new Date(), offeredAt);

    if (hoursSince >= BOOST_CONFIG.AUTO_DECLINE_HOURS) {
        await declineBoost();
        return true;
    }
    return false;
}

// ─── Record Today's Activity ──────────────────────────

export async function recordClosure(): Promise<void> {
    const today = todayStr();
    const records = await loadDailyRecords();
    const record = records[today] ?? {
        date: today,
        closedCount: 0,
        overdueAtEOD: 0,
        rescheduleCount: 0,
        integrityDelta: 0,
        boostUsed: false,
        streakValue: null,
    };

    record.closedCount += 1;
    const state = await getUserState();
    record.streakValue = state.streak;

    // Mark first closure ever
    if (!state.firstClosureEver) {
        state.firstClosureEver = true;
        await saveUserState(state);
    }

    await saveDailyRecord(record);
}

export async function unrecordClosure(): Promise<void> {
    const today = todayStr();
    const records = await loadDailyRecords();
    const record = records[today];
    if (!record) return;
    record.closedCount = Math.max(0, record.closedCount - 1);
    await saveDailyRecord(record);
}

export async function recordReschedule(): Promise<number> {
    const today = todayStr();
    const records = await loadDailyRecords();
    const record = records[today] ?? {
        date: today,
        closedCount: 0,
        overdueAtEOD: 0,
        rescheduleCount: 0,
        integrityDelta: 0,
        boostUsed: false,
        streakValue: null,
    };

    record.rescheduleCount += 1;
    await saveDailyRecord(record);
    return record.rescheduleCount;
}

export async function getTodayRecord(): Promise<DailyRecord> {
    const today = todayStr();
    const record = await getDailyRecord(today);
    return record ?? {
        date: today,
        closedCount: 0,
        overdueAtEOD: 0,
        rescheduleCount: 0,
        integrityDelta: 0,
        boostUsed: false,
        streakValue: null,
    };
}
