// Ravyn — Unit tests: streakService
// Tests processDays, recordClosure, useBoost, declineBoost with mocked storage.

import { format, subDays } from 'date-fns';
import {
    processDays,
    recordClosure,
    recordReschedule,
    useBoost,
    declineBoost,
    checkAutoDeclineBoost,
    getTodayRecord,
} from '../services/streakService';
import { DEFAULT_USER_STATE } from '../types';
import type { UserState, DailyRecord } from '../types';

// ── Mock storageService ───────────────────────────────────────────────────────

const store: Record<string, unknown> = {};

jest.mock('../services/storageService', () => ({
    StorageKeys: {
        USER_STATE: '@ravyn/userState',
        TASKS: '@ravyn/tasks',
        TAGS: '@ravyn/tags',
        DAILY_RECORDS: '@ravyn/dailyRecords',
        INTEGRITY_EVENTS: '@ravyn/integrityEvents',
        LAST_SYNC_AT: '@ravyn/lastSyncAt',
        HINTS_SEEN: '@ravyn/hintsSeen',
    },
    getItem: jest.fn(async (key: string) => store[key] ?? null),
    setItem: jest.fn(async (key: string, value: unknown) => { store[key] = value; }),
}));

// Mock taskService.markOverdueTasks to be a no-op in tests
jest.mock('../services/taskService', () => ({
    markOverdueTasks: jest.fn(async () => {}),
    getClosedTodayTasks: jest.fn(async () => []),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
const threeDaysAgo = format(subDays(new Date(), 3), 'yyyy-MM-dd');

function setUserState(overrides: Partial<UserState> = {}) {
    store['@ravyn/userState'] = { ...DEFAULT_USER_STATE, ...overrides };
}

function setDailyRecord(date: string, record: Partial<DailyRecord>) {
    const existing = (store['@ravyn/dailyRecords'] as Record<string, DailyRecord>) ?? {};
    store['@ravyn/dailyRecords'] = {
        ...existing,
        [date]: {
            date,
            closedCount: 0,
            overdueAtEOD: 0,
            rescheduleCount: 0,
            integrityDelta: 0,
            boostUsed: false,
            streakValue: null,
            ...record,
        },
    };
}

beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
});

// ── processDays ───────────────────────────────────────────────────────────────

describe('processDays — first ever run', () => {
    it('sets lastProcessedDate to yesterday and returns no streak change', async () => {
        setUserState({ lastProcessedDate: null });
        const result = await processDays();
        expect(result.streakChanged).toBe(false);
        expect(result.newStreak).toBeNull();
        const state = store['@ravyn/userState'] as UserState;
        expect(state.lastProcessedDate).toBe(yesterday);
    });
});

describe('processDays — already processed today', () => {
    it('returns early without changing state', async () => {
        setUserState({ lastProcessedDate: today, streak: 5 });
        const result = await processDays();
        expect(result.streakChanged).toBe(false);
        expect(result.newStreak).toBe(5);
    });
});

describe('processDays — active streak (closures yesterday)', () => {
    it('increments streak when yesterday had closures', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 3 });
        setDailyRecord(yesterday, { closedCount: 2 });
        const result = await processDays();
        expect(result.streakChanged).toBe(true);
        expect(result.newStreak).toBe(4);
    });

    it('awards daily bonus and clean day points when closures and no overdue', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 1, integrityPoints: 0 });
        setDailyRecord(yesterday, { closedCount: 1, overdueAtEOD: 0 });
        await processDays();
        const state = store['@ravyn/userState'] as UserState;
        // +3 daily bonus + +5 clean day = +8
        expect(state.integrityPoints).toBe(8);
    });

    it('awards only daily bonus (no clean day) when there are overdue tasks', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 1, integrityPoints: 0 });
        setDailyRecord(yesterday, { closedCount: 1, overdueAtEOD: 2 });
        await processDays();
        const state = store['@ravyn/userState'] as UserState;
        // +3 daily bonus; no clean day; -2 overdue penalty (2 * -1, cap -5)
        expect(state.integrityPoints).toBe(1);
    });

    it('detects streak milestones', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 6 });
        setDailyRecord(yesterday, { closedCount: 1 });
        const result = await processDays();
        expect(result.newStreak).toBe(7);
        expect(result.milestone).toBe(7);
    });

    it('clears grace date when day is active', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 5, streakGraceDate: twoDaysAgo });
        setDailyRecord(yesterday, { closedCount: 1 });
        await processDays();
        const state = store['@ravyn/userState'] as UserState;
        expect(state.streakGraceDate).toBeNull();
    });
});

describe('processDays — missed day (no closures)', () => {
    it('grants grace period on first missed day', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 5, streakGraceDate: null, boostTokens: 0 });
        // No daily record for yesterday → 0 closures
        const result = await processDays();
        expect(result.streakChanged).toBe(false);
        const state = store['@ravyn/userState'] as UserState;
        expect(state.streakGraceDate).toBe(yesterday);
        expect(state.streak).toBe(5); // Streak preserved during grace
    });

    it('resets streak when grace is already used', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 5, streakGraceDate: twoDaysAgo, boostTokens: 0 });
        // No record for yesterday → second missed day → reset
        const result = await processDays();
        expect(result.streakChanged).toBe(true);
        expect(result.newStreak).toBe(0);
        const state = store['@ravyn/userState'] as UserState;
        expect(state.streakGraceDate).toBeNull();
    });

    it('offers boost when available on missed day', async () => {
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 5, boostTokens: 2, pendingBoostOffer: false });
        const result = await processDays();
        expect(result.boostOffered).toBe(true);
        const state = store['@ravyn/userState'] as UserState;
        expect(state.pendingBoostOffer).toBe(true);
        expect(state.streak).toBe(5); // Streak preserved pending boost decision
    });

    it('falls through to grace when boost offer is already pending (no infinite protection)', async () => {
        // pendingBoostOffer=true from a prior day — should not protect this new missed day
        setUserState({ lastProcessedDate: twoDaysAgo, streak: 5, boostTokens: 1, pendingBoostOffer: true, streakGraceDate: null });
        await processDays();
        const state = store['@ravyn/userState'] as UserState;
        // Grace should be applied, not another boost offer
        expect(state.streakGraceDate).toBe(yesterday);
        expect(state.streak).toBe(5);
    });
});

describe('processDays — multiple missed days backfill', () => {
    it('processes 3 missed active days and increments streak by 3', async () => {
        setUserState({ lastProcessedDate: threeDaysAgo, streak: 1 });
        setDailyRecord(twoDaysAgo, { closedCount: 2 });
        setDailyRecord(yesterday, { closedCount: 1 });
        // No record for threeDaysAgo+1 (twoDaysAgo already set)
        // Processes twoDaysAgo and yesterday → streak +2 (from 1 → 3)
        const result = await processDays();
        expect(result.streakChanged).toBe(true);
        expect(result.newStreak).toBe(3);
    });

    it('resets streak correctly when multiple days are missed', async () => {
        // 3 days gap, no closures, no grace yet
        setUserState({ lastProcessedDate: threeDaysAgo, streak: 10, boostTokens: 0, streakGraceDate: null });
        // No daily records → two consecutive missed days processed → grace then reset
        const result = await processDays();
        // twoDaysAgo: grace granted
        // yesterday: grace already used → streak resets
        expect(result.newStreak).toBe(0);
        expect(result.streakChanged).toBe(true);
    });
});

// ── recordClosure ─────────────────────────────────────────────────────────────

describe('recordClosure', () => {
    it('increments closedCount in today record', async () => {
        setUserState({ firstClosureEver: false, streak: 1 });
        await recordClosure();
        const record = await getTodayRecord();
        expect(record.closedCount).toBe(1);
    });

    it('accumulates multiple closures', async () => {
        setUserState({ firstClosureEver: true, streak: 2 });
        await recordClosure();
        await recordClosure();
        await recordClosure();
        const record = await getTodayRecord();
        expect(record.closedCount).toBe(3);
    });

    it('marks firstClosureEver on first closure', async () => {
        setUserState({ firstClosureEver: false });
        await recordClosure();
        const state = store['@ravyn/userState'] as UserState;
        expect(state.firstClosureEver).toBe(true);
    });
});

// ── recordReschedule ──────────────────────────────────────────────────────────

describe('recordReschedule', () => {
    it('increments rescheduleCount and returns the new count', async () => {
        const count1 = await recordReschedule();
        expect(count1).toBe(1);
        const count2 = await recordReschedule();
        expect(count2).toBe(2);
    });
});

// ── boost actions ─────────────────────────────────────────────────────────────

describe('useBoost', () => {
    it('consumes a boost token and clears pendingBoostOffer', async () => {
        setUserState({ boostTokens: 2, pendingBoostOffer: true, streak: 7 });
        const state = await useBoost();
        expect(state.boostTokens).toBe(1);
        expect(state.pendingBoostOffer).toBe(false);
        expect(state.streak).toBe(7); // Streak preserved
    });

    it('does nothing when no pending offer', async () => {
        setUserState({ boostTokens: 2, pendingBoostOffer: false });
        const state = await useBoost();
        expect(state.boostTokens).toBe(2); // Unchanged
    });
});

describe('declineBoost', () => {
    it('clears pendingBoostOffer, resets streak to 0, and clears streakGraceDate', async () => {
        setUserState({ boostTokens: 1, pendingBoostOffer: true, streak: 5, streakGraceDate: yesterday });
        const state = await declineBoost();
        expect(state.pendingBoostOffer).toBe(false);
        expect(state.streak).toBe(0);
        expect(state.streakGraceDate).toBeNull();
        expect(state.boostTokens).toBe(1); // Tokens NOT consumed on decline
    });
});

describe('checkAutoDeclineBoost', () => {
    it('returns false when no pending boost offer', async () => {
        setUserState({ pendingBoostOffer: false });
        const declined = await checkAutoDeclineBoost();
        expect(declined).toBe(false);
    });

    it('returns false when boost offered less than 24h ago', async () => {
        const recentOffer = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        setUserState({ pendingBoostOffer: true, boostOfferTimestamp: recentOffer, streak: 3 });
        const declined = await checkAutoDeclineBoost();
        expect(declined).toBe(false);
    });

    it('auto-declines and resets streak when offer is 24h+ old', async () => {
        const oldOffer = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
        setUserState({ pendingBoostOffer: true, boostOfferTimestamp: oldOffer, streak: 3, boostTokens: 1 });
        const declined = await checkAutoDeclineBoost();
        expect(declined).toBe(true);
        const state = store['@ravyn/userState'] as UserState;
        expect(state.pendingBoostOffer).toBe(false);
        expect(state.streak).toBe(0);
    });
});
