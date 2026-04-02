// Ravyn — Unit tests: integrityService
// Tests pure calculation functions and stateful applyPoints (with mocked storage).

import {
    calculateClosePoints,
    calculateDailyBonus,
    calculateCleanDayBonus,
    calculateOverduePenalty,
    calculateReschedulePenalty,
    calculateDeleteOverduePenalty,
    applyPoints,
    getUserState,
} from '../services/integrityService';
import { INTEGRITY_POINTS, RESCHEDULE_CONFIG, BOOST_CONFIG, DEFAULT_USER_STATE } from '../types';

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

beforeEach(() => {
    // Reset in-memory store and all mock call history
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
});

// ── Pure calculation functions ────────────────────────────────────────────────

describe('calculateClosePoints', () => {
    it('returns +10 for on_time', () => {
        expect(calculateClosePoints('on_time')).toBe(INTEGRITY_POINTS.CLOSE_ON_TIME);
    });
    it('returns +4 for late', () => {
        expect(calculateClosePoints('late')).toBe(INTEGRITY_POINTS.CLOSE_LATE);
    });
    it('returns +2 for overdue', () => {
        expect(calculateClosePoints('overdue')).toBe(INTEGRITY_POINTS.CLOSE_OVERDUE);
    });
});

describe('calculateDailyBonus', () => {
    it('returns +3', () => {
        expect(calculateDailyBonus()).toBe(INTEGRITY_POINTS.DAILY_BONUS);
    });
});

describe('calculateCleanDayBonus', () => {
    it('returns +5', () => {
        expect(calculateCleanDayBonus()).toBe(INTEGRITY_POINTS.CLEAN_DAY);
    });
});

describe('calculateOverduePenalty', () => {
    it('returns -1 per overdue item', () => {
        expect(calculateOverduePenalty(1)).toBe(-1);
        expect(calculateOverduePenalty(3)).toBe(-3);
    });
    it('caps at -5 regardless of count', () => {
        expect(calculateOverduePenalty(5)).toBe(INTEGRITY_POINTS.OVERDUE_PENALTY_CAP);
        expect(calculateOverduePenalty(10)).toBe(INTEGRITY_POINTS.OVERDUE_PENALTY_CAP);
        expect(calculateOverduePenalty(100)).toBe(INTEGRITY_POINTS.OVERDUE_PENALTY_CAP);
    });
    it('returns 0 for zero overdue', () => {
        expect(calculateOverduePenalty(0)).toBe(0);
    });
});

describe('calculateReschedulePenalty', () => {
    it('returns 0 for reschedules within free allowance', () => {
        expect(calculateReschedulePenalty(0)).toBe(0);
        expect(calculateReschedulePenalty(1)).toBe(0);
        expect(calculateReschedulePenalty(RESCHEDULE_CONFIG.FREE_PER_DAY)).toBe(0);
    });
    it('returns -2 for reschedules beyond free allowance', () => {
        expect(calculateReschedulePenalty(RESCHEDULE_CONFIG.FREE_PER_DAY + 1)).toBe(INTEGRITY_POINTS.RESCHEDULE_PENALTY);
        expect(calculateReschedulePenalty(5)).toBe(INTEGRITY_POINTS.RESCHEDULE_PENALTY);
    });
});

describe('calculateDeleteOverduePenalty', () => {
    it('returns -3', () => {
        expect(calculateDeleteOverduePenalty()).toBe(INTEGRITY_POINTS.DELETE_OVERDUE);
    });
});

// ── applyPoints (stateful, uses mocked storage) ───────────────────────────────

describe('applyPoints', () => {
    it('adds positive points to zero state', async () => {
        const state = await applyPoints(10, 'close_on_time');
        expect(state.integrityPoints).toBe(10);
    });

    it('deducts negative points and floors at 0', async () => {
        // Start at 5 points
        await applyPoints(5, 'close_on_time');
        // Deduct 20 — should floor at 0
        const state = await applyPoints(-20, 'overdue_penalty');
        expect(state.integrityPoints).toBe(0);
    });

    it('auto-converts to a boost token when threshold is reached', async () => {
        const state = await applyPoints(BOOST_CONFIG.THRESHOLD, 'close_on_time');
        expect(state.boostTokens).toBe(1);
        expect(state.integrityPoints).toBe(0);
    });

    it('does not exceed MAX_TOKENS boost tokens', async () => {
        // Earn enough for 4 boosts (only 3 max allowed)
        const bigPoints = BOOST_CONFIG.THRESHOLD * (BOOST_CONFIG.MAX_TOKENS + 1);
        const state = await applyPoints(bigPoints, 'close_on_time');
        expect(state.boostTokens).toBe(BOOST_CONFIG.MAX_TOKENS);
    });

    it('freezes points at threshold when all boost slots full', async () => {
        // Fill boost slots first
        await applyPoints(BOOST_CONFIG.THRESHOLD * BOOST_CONFIG.MAX_TOKENS, 'close_on_time');
        // Add more points
        const state = await applyPoints(50, 'close_on_time');
        expect(state.boostTokens).toBe(BOOST_CONFIG.MAX_TOKENS);
        expect(state.integrityPoints).toBeLessThanOrEqual(BOOST_CONFIG.THRESHOLD);
    });

    it('logs an integrity event for each applyPoints call', async () => {
        await applyPoints(10, 'close_on_time', 'task-abc');
        await applyPoints(-2, 'reschedule_penalty');
        const state = await getUserState();
        // Events are stored separately — check via getItem
        const { getItem } = require('../services/storageService');
        const events = await getItem('@ravyn/integrityEvents');
        expect(events).toHaveLength(2);
        expect(events[0].type).toBe('close_on_time');
        expect(events[0].points).toBe(10);
        expect(events[0].taskId).toBe('task-abc');
        expect(events[1].type).toBe('reschedule_penalty');
    });

    it('accumulates points across multiple calls', async () => {
        await applyPoints(10, 'close_on_time');
        await applyPoints(4, 'close_late');
        const state = await applyPoints(3, 'daily_bonus');
        expect(state.integrityPoints).toBe(17);
    });
});
