// Ravyn — Unit tests: taskService
// Tests pure/stateless functions: getCloseType, getTodayRescheduleCount.

import { getCloseType, getTodayRescheduleCount } from '../services/taskService';
import { format, subDays, addDays } from 'date-fns';
import type { Task } from '../types';

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

// Mock expo-crypto (not available in Jest environment)
jest.mock('expo-crypto', () => ({
    randomUUID: () => 'test-uuid-' + Math.random(),
}));

beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    jest.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const today = format(new Date(), 'yyyy-MM-dd');
const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const twoDaysAgo = format(subDays(new Date(), 2), 'yyyy-MM-dd');
const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

function makeTask(overrides: Partial<Task> = {}): Task {
    return {
        id: 'task-1',
        title: 'Test task',
        createdAt: new Date().toISOString(),
        dueDate: today,
        closedAt: null,
        status: 'open',
        rescheduledCount: 0,
        ...overrides,
    };
}

// ── getCloseType ──────────────────────────────────────────────────────────────

describe('getCloseType', () => {
    it('returns on_time for task due today', () => {
        const task = makeTask({ dueDate: today });
        expect(getCloseType(task)).toBe('on_time');
    });

    it('returns on_time for task due tomorrow (closing early)', () => {
        const task = makeTask({ dueDate: tomorrow });
        expect(getCloseType(task)).toBe('on_time');
    });

    it('returns on_time for task with no due date', () => {
        const task = makeTask({ dueDate: null });
        expect(getCloseType(task)).toBe('on_time');
    });

    it('returns overdue for task due 2+ days ago', () => {
        const task = makeTask({ dueDate: twoDaysAgo });
        expect(getCloseType(task)).toBe('overdue');
    });

    it('returns late or overdue for task due yesterday', () => {
        // Yesterday is either "late" (if <12h into today) or "overdue" (>12h)
        // In test env the hour is 0-based so usually >12h → overdue
        const task = makeTask({ dueDate: yesterday });
        const result = getCloseType(task);
        expect(['late', 'overdue']).toContain(result);
    });
});

// ── getTodayRescheduleCount ───────────────────────────────────────────────────

describe('getTodayRescheduleCount', () => {
    it('returns 0 when no daily record exists', async () => {
        const count = await getTodayRescheduleCount();
        expect(count).toBe(0);
    });

    it('returns 0 when today record has no rescheduleCount', async () => {
        store['@ravyn/dailyRecords'] = { [today]: { closedCount: 2 } };
        const count = await getTodayRescheduleCount();
        expect(count).toBe(0);
    });

    it('returns the stored reschedule count for today', async () => {
        store['@ravyn/dailyRecords'] = {
            [today]: { closedCount: 1, rescheduleCount: 3 },
        };
        const count = await getTodayRescheduleCount();
        expect(count).toBe(3);
    });

    it('ignores reschedule counts from other days', async () => {
        store['@ravyn/dailyRecords'] = {
            [yesterday]: { rescheduleCount: 5 },
            [today]: { rescheduleCount: 1 },
        };
        const count = await getTodayRescheduleCount();
        expect(count).toBe(1);
    });
});
