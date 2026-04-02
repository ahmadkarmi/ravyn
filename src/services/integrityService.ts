// Ravyn MVP — Integrity Points Engine

import { Task, UserState, INTEGRITY_POINTS, BOOST_CONFIG, RESCHEDULE_CONFIG, IntegrityEvent, DEFAULT_USER_STATE } from '../types';
import { getItem, setItem, StorageKeys } from './storageService';

// ─── State Access ─────────────────────────────────────

export async function getUserState(): Promise<UserState> {
    return (await getItem<UserState>(StorageKeys.USER_STATE)) ?? { ...DEFAULT_USER_STATE };
}

export async function saveUserState(state: UserState): Promise<void> {
    await setItem(StorageKeys.USER_STATE, state);
}

// ─── Point Calculations ───────────────────────────────

export function calculateClosePoints(closeType: 'on_time' | 'late' | 'overdue'): number {
    switch (closeType) {
        case 'on_time': return INTEGRITY_POINTS.CLOSE_ON_TIME;   // +10
        case 'late': return INTEGRITY_POINTS.CLOSE_LATE;          // +4
        case 'overdue': return INTEGRITY_POINTS.CLOSE_OVERDUE;    // +2
    }
}

export function calculateDailyBonus(): number {
    return INTEGRITY_POINTS.DAILY_BONUS; // +3
}

export function calculateCleanDayBonus(): number {
    return INTEGRITY_POINTS.CLEAN_DAY; // +5
}

export function calculateOverduePenalty(overdueCount: number): number {
    if (overdueCount <= 0) return 0;
    const raw = overdueCount * INTEGRITY_POINTS.OVERDUE_PENALTY;
    return Math.max(raw, INTEGRITY_POINTS.OVERDUE_PENALTY_CAP); // cap at -5
}

export function calculateReschedulePenalty(dailyRescheduleCount: number): number {
    if (dailyRescheduleCount <= RESCHEDULE_CONFIG.FREE_PER_DAY) return 0;
    return INTEGRITY_POINTS.RESCHEDULE_PENALTY; // -2 per additional
}

export function calculateDeleteOverduePenalty(): number {
    return INTEGRITY_POINTS.DELETE_OVERDUE; // -3
}

// ─── Apply Points ────────────────────────────────────

export async function applyPoints(delta: number, eventType: IntegrityEvent['type'], taskId?: string): Promise<UserState> {
    const state = await getUserState();

    if (delta > 0) {
        state.integrityPoints += delta;

        // Auto-convert: every time we hit the threshold, earn a boost
        while (
            state.integrityPoints >= BOOST_CONFIG.THRESHOLD &&
            state.boostTokens < BOOST_CONFIG.MAX_TOKENS
        ) {
            state.boostTokens += 1;
            state.integrityPoints -= BOOST_CONFIG.THRESHOLD;
        }

        // Freeze at threshold if all boost slots are full
        if (state.boostTokens >= BOOST_CONFIG.MAX_TOKENS) {
            state.boostTokens = BOOST_CONFIG.MAX_TOKENS; // cap at 3
            state.integrityPoints = Math.min(
                state.integrityPoints,
                BOOST_CONFIG.THRESHOLD,
            );
        }
    } else {
        // Penalties: deduct from points, floor at 0
        state.integrityPoints = Math.max(0, state.integrityPoints + delta);
    }

    await saveUserState(state);

    // Log event
    const events = (await getItem<IntegrityEvent[]>(StorageKeys.INTEGRITY_EVENTS)) ?? [];
    events.push({
        type: eventType,
        points: delta,
        timestamp: new Date().toISOString(),
        taskId,
    });
    await setItem(StorageKeys.INTEGRITY_EVENTS, events);

    return state;
}

// ─── Convenience ──────────────────────────────────────

export async function awardClosePoints(task: Task, closeType: 'on_time' | 'late' | 'overdue'): Promise<UserState> {
    const pts = calculateClosePoints(closeType);
    const eventMap: Record<string, IntegrityEvent['type']> = {
        on_time: 'close_on_time',
        late: 'close_late',
        overdue: 'close_overdue',
    };
    return applyPoints(pts, eventMap[closeType], task.id);
}

export async function awardDailyBonus(): Promise<UserState> {
    return applyPoints(calculateDailyBonus(), 'daily_bonus');
}

export async function awardCleanDay(): Promise<UserState> {
    return applyPoints(calculateCleanDayBonus(), 'clean_day');
}

export async function penalizeOverdue(count: number): Promise<UserState> {
    const pts = calculateOverduePenalty(count);
    return applyPoints(pts, 'overdue_penalty');
}

export async function penalizeReschedule(dailyCount: number): Promise<UserState> {
    const pts = calculateReschedulePenalty(dailyCount);
    if (pts === 0) return getUserState();
    return applyPoints(pts, 'reschedule_penalty');
}

export async function penalizeDeleteOverdue(taskId: string): Promise<UserState> {
    return applyPoints(calculateDeleteOverduePenalty(), 'delete_overdue_penalty', taskId);
}

export async function penalizeUncompletion(taskId: string): Promise<UserState> {
    // Find last positive event for this task
    const events = (await getItem<IntegrityEvent[]>(StorageKeys.INTEGRITY_EVENTS)) ?? [];
    const lastCloseEvent = events
        .slice()
        .reverse()
        .find(e => e.taskId === taskId && e.points > 0 && e.type.startsWith('close_'));

    // Deduct points gained (or default 10 if not found)
    const pointsToDeduct = lastCloseEvent ? -lastCloseEvent.points : -INTEGRITY_POINTS.CLOSE_ON_TIME;

    return applyPoints(pointsToDeduct, 'uncomplete_penalty', taskId);
}

/** Get progress toward next boost as 0..1 */
export async function getBoostProgress(): Promise<number> {
    const state = await getUserState();
    if (state.boostTokens >= BOOST_CONFIG.MAX_TOKENS) return 1;
    return state.integrityPoints / BOOST_CONFIG.THRESHOLD;
}
