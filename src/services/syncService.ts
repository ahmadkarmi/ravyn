// Ravyn — Offline-First Sync Service
// Strategy: write locally first, then push to Supabase in background.
// On foreground/login: pull remote changes since last sync, merge with local using last-write-wins.

import { supabase } from '../lib/supabase';
import { getItem, setItem, StorageKeys } from './storageService';
import { Task, Tag, UserState, DailyRecord, IntegrityEvent } from '../types';
import * as TaskService from './taskService';
import * as TagService from './tagService';

// ─── Last Sync Tracking ──────────────────────────────

async function getLastSyncAt(): Promise<string | null> {
    return getItem<string>(StorageKeys.LAST_SYNC_AT);
}

async function setLastSyncAt(ts: string): Promise<void> {
    await setItem(StorageKeys.LAST_SYNC_AT, ts);
}

// ─── Auth Helper ─────────────────────────────────────

async function getUserId(): Promise<string | null> {
    try {
        const { data } = await supabase.auth.getUser();
        return data.user?.id ?? null;
    } catch {
        return null;
    }
}

// ─── Task Sync ───────────────────────────────────────

async function pushTasks(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const localTasks = await TaskService.getAllTasksIncludingDeleted();
    if (localTasks.length === 0) return;

    const rows = localTasks.map((t) => ({
        id: t.id,
        user_id: userId,
        title: t.title,
        description: t.description ?? null,
        created_at: t.createdAt,
        due_date: t.dueDate,
        closed_at: t.closedAt,
        status: t.status,
        rescheduled_count: t.rescheduledCount,
        tags: t.tags ?? [],
        recurrence: t.recurrence ?? null,
        recurrence_source_id: t.recurrenceSourceId ?? null,
        priority: t.priority ?? null,
        reminder_time: t.reminderTime ?? null,
        reminder_notification_id: t.reminderNotificationId ?? null,
        manual_order: t.manualOrder ?? null,
        app_type: t.appType ?? null,
        app_payload: t.appPayload ?? null,
        updated_at: t.updatedAt ?? t.createdAt,
        deleted_at: t.deletedAt ?? null,
    }));

    const { error } = await supabase
        .from('tasks')
        .upsert(rows, { onConflict: 'id' });

    if (error) console.error('[Sync] pushTasks error:', error.message);
}

async function pullTasks(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const lastSync = await getLastSyncAt();
    let query = supabase.from('tasks').select('*').eq('user_id', userId);
    if (lastSync) query = query.gte('updated_at', lastSync);

    const { data, error } = await query;
    if (error) {
        console.error('[Sync] pullTasks error:', error.message);
        return;
    }
    if (!data || data.length === 0) return;

    const localTasks = await TaskService.getAllTasksIncludingDeleted();
    const localMap = new Map(localTasks.map((t) => [t.id, t]));

    for (const remote of data) {
        const local = localMap.get(remote.id);
        const remoteUpdated = remote.updated_at ?? remote.created_at;
        const localUpdated = local?.updatedAt ?? local?.createdAt ?? '';

        // Last-write-wins: remote is newer or doesn't exist locally
        if (!local || remoteUpdated > localUpdated) {
            const merged: Task = {
                id: remote.id,
                title: remote.title,
                description: remote.description || undefined,
                createdAt: remote.created_at,
                dueDate: remote.due_date,
                closedAt: remote.closed_at,
                status: remote.status,
                rescheduledCount: remote.rescheduled_count,
                tags: remote.tags && remote.tags.length > 0 ? remote.tags : undefined,
                recurrence: remote.recurrence || undefined,
                recurrenceSourceId: remote.recurrence_source_id || undefined,
                priority: remote.priority || undefined,
                reminderTime: remote.reminder_time || undefined,
                reminderNotificationId: remote.reminder_notification_id || undefined,
                manualOrder: remote.manual_order ?? undefined,
                updatedAt: remoteUpdated,
                deletedAt: remote.deleted_at,
                appType: remote.app_type,
                appPayload: remote.app_payload,
            };
            localMap.set(remote.id, merged);
        }
    }

    await setItem(StorageKeys.TASKS, Array.from(localMap.values()));
}

// ─── Tag Sync ────────────────────────────────────────

async function pushTags(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const localTags = await TagService.getAllTagsIncludingDeleted();
    if (localTags.length === 0) return;

    const rows = localTags.map((t) => ({
        id: t.id,
        user_id: userId,
        label: t.label,
        color: t.color,
        updated_at: t.updatedAt ?? new Date().toISOString(),
        deleted_at: t.deletedAt ?? null,
    }));

    const { error } = await supabase
        .from('tags')
        .upsert(rows, { onConflict: 'id' });

    if (error) console.error('[Sync] pushTags error:', error.message);
}

async function pullTags(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const lastSync = await getLastSyncAt();
    let query = supabase.from('tags').select('*').eq('user_id', userId);
    if (lastSync) query = query.gte('updated_at', lastSync);

    const { data, error } = await query;
    if (error) {
        console.error('[Sync] pullTags error:', error.message);
        return;
    }
    if (!data || data.length === 0) return;

    const localTags = await TagService.getAllTagsIncludingDeleted();
    const localMap = new Map(localTags.map((t) => [t.id, t]));

    for (const remote of data) {
        const local = localMap.get(remote.id);
        const remoteUpdated = remote.updated_at;
        const localUpdated = local?.updatedAt ?? '';

        if (!local || remoteUpdated > localUpdated) {
            const merged: Tag = {
                id: remote.id,
                label: remote.label,
                color: remote.color,
                updatedAt: remoteUpdated,
                deletedAt: remote.deleted_at,
            };
            localMap.set(remote.id, merged);
        }
    }

    await setItem(StorageKeys.TAGS, Array.from(localMap.values()));
}

// ─── User State Sync ─────────────────────────────────

async function pushUserState(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const state = await getItem<UserState>(StorageKeys.USER_STATE);
    if (!state) return;

    const { error } = await supabase
        .from('user_state')
        .upsert({
            user_id: userId,
            streak: state.streak,
            integrity_points: state.integrityPoints,
            boost_tokens: state.boostTokens,
            onboarding_complete: state.onboardingComplete,
            start_of_day: state.startOfDay,
            end_of_day: state.endOfDay,
            pending_boost_offer: state.pendingBoostOffer,
            boost_offer_timestamp: state.boostOfferTimestamp,
            last_processed_date: state.lastProcessedDate,
            first_closure_ever: state.firstClosureEver,
            streak_grace_date: state.streakGraceDate,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (error) console.error('[Sync] pushUserState error:', error.message);
}

async function pullUserState(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabase
        .from('user_state')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !data) return;

    const localState = await getItem<UserState>(StorageKeys.USER_STATE);
    // If no local state, or remote is newer, use remote
    if (!localState) {
        const remote: UserState = mapRemoteUserState(data);
        await setItem(StorageKeys.USER_STATE, remote);
        return;
    }

    const remote: UserState = mapRemoteUserState(data);
    const remoteUpdatedAt: string = (data.updated_at as string) ?? '';
    const localSyncedAt = (await getItem<string>(StorageKeys.LAST_SYNC_AT)) ?? '';

    // lastProcessedDate: most recent wins — prevents re-processing already handled days
    const localLPD = localState.lastProcessedDate ?? '';
    const remoteLPD = remote.lastProcessedDate ?? '';
    const mergedLPD = localLPD > remoteLPD ? localLPD : (remoteLPD || null);

    // Streak authority: whichever device has the more recent lastProcessedDate owns the streak
    // If both are equally up-to-date, take the higher value (generous merge)
    const streakAuthority = localLPD > remoteLPD
        ? (localState.streak ?? 0)
        : remoteLPD > localLPD
            ? (remote.streak ?? 0)
            : Math.max(remote.streak ?? 0, localState.streak ?? 0);
    const mergedStreak = streakAuthority || remote.streak; // preserve null if both are null/0

    // Integrity points must follow the side that has more boost tokens, because a conversion
    // (points ≥ 200 → tokens+1, points-200) causes points to DROP. Taking Math.max would
    // silently undo that conversion by restoring the stale pre-conversion value from the other side.
    const mergedBoostTokens = Math.max(remote.boostTokens, localState.boostTokens);
    const mergedIntegrityPoints =
        localState.boostTokens > remote.boostTokens ? localState.integrityPoints
        : remote.boostTokens > localState.boostTokens ? remote.integrityPoints
        : localLPD > remoteLPD ? localState.integrityPoints
        : remoteLPD > localLPD ? remote.integrityPoints
        // Remote was updated after our last sync — a manual correction or another device
        : remoteUpdatedAt > localSyncedAt ? remote.integrityPoints
        : Math.max(remote.integrityPoints, localState.integrityPoints);

    const merged: UserState = {
        ...remote,
        streak: mergedStreak as number | null,
        integrityPoints: mergedIntegrityPoints,
        boostTokens: mergedBoostTokens,
        lastProcessedDate: mergedLPD,
        onboardingComplete: localState.onboardingComplete || remote.onboardingComplete,
        firstClosureEver: localState.firstClosureEver || remote.firstClosureEver,
    };
    await setItem(StorageKeys.USER_STATE, merged);
}

function mapRemoteUserState(data: Record<string, unknown>): UserState {
    return {
        streak: data.streak as number | null,
        integrityPoints: (data.integrity_points as number) ?? 0,
        boostTokens: (data.boost_tokens as number) ?? 0,
        onboardingComplete: (data.onboarding_complete as boolean) ?? false,
        startOfDay: (data.start_of_day as string) ?? '08:00',
        endOfDay: (data.end_of_day as string) ?? '22:00',
        pendingBoostOffer: (data.pending_boost_offer as boolean) ?? false,
        boostOfferTimestamp: (data.boost_offer_timestamp as string) ?? null,
        lastProcessedDate: (data.last_processed_date as string) ?? null,
        firstClosureEver: (data.first_closure_ever as boolean) ?? false,
        streakGraceDate: (data.streak_grace_date as string) ?? null,
    };
}

// ─── Daily Records Sync ──────────────────────────────

async function pullDailyRecords(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const { data, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('user_id', userId);

    if (error || !data || data.length === 0) return;

    const local = await getItem<Record<string, import('../types').DailyRecord>>(StorageKeys.DAILY_RECORDS) ?? {};

    for (const r of data) {
        // Remote wins if local doesn't have this date or remote is newer
        if (!local[r.date] || (r.updated_at && r.updated_at > (local[r.date] as any).updatedAt)) {
            local[r.date] = {
                date: r.date,
                closedCount: r.closed_count,
                overdueAtEOD: r.overdue_at_eod,
                rescheduleCount: r.reschedule_count,
                integrityDelta: r.integrity_delta,
                boostUsed: r.boost_used,
                streakValue: r.streak_value,
            };
        }
    }

    await setItem(StorageKeys.DAILY_RECORDS, local);
}

async function pushDailyRecords(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const raw = await getItem<Record<string, DailyRecord> | DailyRecord[]>(StorageKeys.DAILY_RECORDS);
    if (!raw) return;
    const records = Array.isArray(raw) ? raw : Object.values(raw);
    if (records.length === 0) return;

    const rows = records.map((r) => ({
        user_id: userId,
        date: r.date,
        closed_count: r.closedCount,
        overdue_at_eod: r.overdueAtEOD,
        reschedule_count: r.rescheduleCount,
        integrity_delta: r.integrityDelta,
        boost_used: r.boostUsed,
        streak_value: r.streakValue,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('daily_records')
        .upsert(rows, { onConflict: 'user_id,date' });

    if (error) console.error('[Sync] pushDailyRecords error:', error.message);
}

// ─── Integrity Events Sync ───────────────────────────

async function pushIntegrityEvents(): Promise<void> {
    const userId = await getUserId();
    if (!userId) return;

    const events = await getItem<IntegrityEvent[]>(StorageKeys.INTEGRITY_EVENTS);
    if (!events || events.length === 0) return;

    // Only push events that haven't been pushed yet — prevents duplicates on repeated syncs
    const lastPushed = (await getItem<number>(StorageKeys.LAST_PUSHED_EVENT_COUNT)) ?? 0;
    const newEvents = events.slice(lastPushed);
    if (newEvents.length === 0) return;

    const rows = newEvents.map((e) => ({
        user_id: userId,
        type: e.type,
        points: e.points,
        timestamp: e.timestamp,
        task_id: e.taskId ?? null,
        updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
        .from('integrity_events')
        .insert(rows);

    if (error) {
        console.error('[Sync] pushIntegrityEvents error:', error.message);
        return;
    }

    // Advance the cursor only on success
    await setItem(StorageKeys.LAST_PUSHED_EVENT_COUNT, events.length);
}

// ─── Full Sync ───────────────────────────────────────

let isSyncing = false;

export async function sync(): Promise<void> {
    if (isSyncing) return;
    isSyncing = true;

    try {
        const userId = await getUserId();
        if (!userId) return;

        // Pull user_state first so remote-authoritative values (streak, integrity, boosts)
        // are merged into local state before we push — prevents stale local data overwriting DB fixes.
        await pullUserState();

        // Push local changes to remote (user_state now has merged/correct values)
        await Promise.all([
            pushTasks(),
            pushTags(),
            pushUserState(),
            pushDailyRecords(),
            pushIntegrityEvents(),
        ]);

        // Pull tasks, tags, and daily records (user_state already pulled above)
        await Promise.all([
            pullTasks(),
            pullTags(),
            pullDailyRecords(),
        ]);

        // Update last sync timestamp
        await setLastSyncAt(new Date().toISOString());

        console.log('[Sync] Completed successfully');
    } catch (error) {
        console.error('[Sync] Failed:', error);
    } finally {
        isSyncing = false;
    }
}

// Fire-and-forget background sync (for use after mutations)
export function syncInBackground(): void {
    sync().catch((e) => console.error('[Sync] Background sync failed:', e));
}
