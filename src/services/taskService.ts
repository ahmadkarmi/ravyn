// Ravyn MVP — Task CRUD Service

import * as Crypto from 'expo-crypto';
import { Task, RecurrenceType, TaskPriority, RESCHEDULE_CONFIG } from '../types';
import { getItem, setItem, StorageKeys } from './storageService';
import { format, isToday, isBefore, startOfDay, parseISO, differenceInHours, addDays, addWeeks } from 'date-fns';

// ─── Helpers ───────────────────────────────────────────

async function loadAllTasks(): Promise<Task[]> {
    return (await getItem<Task[]>(StorageKeys.TASKS)) ?? [];
}

async function loadActiveTasks(): Promise<Task[]> {
    const all = await loadAllTasks();
    return all.filter((t) => !t.deletedAt);
}

function now(): string {
    return new Date().toISOString();
}

async function saveTasks(tasks: Task[]): Promise<void> {
    await setItem(StorageKeys.TASKS, tasks);
}

function todayStr(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

// ─── CRUD ──────────────────────────────────────────────

interface CreateTaskOptions {
    description?: string;
    recurrence?: RecurrenceType;
    recurrenceSourceId?: string;
    priority?: TaskPriority;
    reminderTime?: string;
    reminderNotificationId?: string;
}

export async function createTask(
    title: string,
    dueDate?: string,
    tags?: string[],
    options?: CreateTaskOptions,
): Promise<Task> {
    const tasks = await loadAllTasks();
    const ts = now();
    const task: Task = {
        id: Crypto.randomUUID(),
        title: title.trim(),
        description: options?.description?.trim() || undefined,
        createdAt: ts,
        dueDate: dueDate ?? todayStr(),
        closedAt: null,
        status: 'open',
        rescheduledCount: 0,
        tags: tags && tags.length > 0 ? tags : undefined,
        recurrence: options?.recurrence ?? undefined,
        recurrenceSourceId: options?.recurrenceSourceId,
        priority: options?.priority ?? undefined,
        reminderTime: options?.reminderTime ?? undefined,
        reminderNotificationId: options?.reminderNotificationId ?? undefined,
        updatedAt: ts,
    };
    tasks.push(task);
    await saveTasks(tasks);
    return task;
}

export async function closeTask(taskId: string): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const ts = now();
    tasks[idx].closedAt = ts;
    tasks[idx].status = 'closed';
    tasks[idx].updatedAt = ts;
    await saveTasks(tasks);

    // Auto-spawn next occurrence for recurring tasks
    if (tasks[idx].recurrence) {
        await spawnRecurringTask(tasks[idx]);
    }

    return tasks[idx];
}

/** Compute the next due date based on recurrence type */
function getNextDueDate(currentDue: string | null, recurrence: RecurrenceType): string {
    const base = currentDue ? parseISO(currentDue) : new Date();
    switch (recurrence) {
        case 'daily':
            return format(addDays(base, 1), 'yyyy-MM-dd');
        case 'weekly':
            return format(addWeeks(base, 1), 'yyyy-MM-dd');
        case 'monthly': {
            const next = new Date(base);
            next.setMonth(next.getMonth() + 1);
            return format(next, 'yyyy-MM-dd');
        }
        default:
            return todayStr();
    }
}

/** Create the next instance of a recurring task */
async function spawnRecurringTask(closedTask: Task): Promise<Task> {
    const nextDue = getNextDueDate(closedTask.dueDate, closedTask.recurrence ?? null);
    return createTask(closedTask.title, nextDue, closedTask.tags, {
        description: closedTask.description,
        recurrence: closedTask.recurrence,
        recurrenceSourceId: closedTask.recurrenceSourceId ?? closedTask.id,
        priority: closedTask.priority,
        reminderTime: closedTask.reminderTime,
    });
}

export async function uncompleteTask(taskId: string): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].closedAt = null;
    tasks[idx].status = 'open';
    tasks[idx].updatedAt = now();
    const today = todayStr();
    if (tasks[idx].dueDate && tasks[idx].dueDate < today) {
        tasks[idx].status = 'overdue';
    }

    await saveTasks(tasks);
    return tasks[idx];
}

export type RescheduleResult =
    | { success: true; task: Task }
    | { success: false; reason: 'not_found' | 'hard_cap' | 'past_date' };

export async function rescheduleTask(
    taskId: string,
    newDate: string,
    dailyRescheduleCount: number
): Promise<RescheduleResult> {
    if (dailyRescheduleCount >= RESCHEDULE_CONFIG.HARD_CAP) {
        return { success: false, reason: 'hard_cap' };
    }
    if (newDate < todayStr()) {
        return { success: false, reason: 'past_date' };
    }

    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return { success: false, reason: 'not_found' };

    tasks[idx].dueDate = newDate;
    tasks[idx].rescheduledCount += 1;
    tasks[idx].updatedAt = now();
    if (newDate >= todayStr()) {
        tasks[idx].status = 'open';
    }
    await saveTasks(tasks);
    return { success: true, task: tasks[idx] };
}

export async function deleteTask(taskId: string): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    const ts = now();
    tasks[idx].deletedAt = ts;
    tasks[idx].updatedAt = ts;
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskTags(taskId: string, tagIds: string[]): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].tags = tagIds.length > 0 ? tagIds : undefined;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskDescription(taskId: string, description: string): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].description = description.trim() || undefined;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskTitle(taskId: string, title: string): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].title = title.trim();
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskRecurrence(taskId: string, recurrence: RecurrenceType): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].recurrence = recurrence ?? undefined;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskPriority(taskId: string, priority: TaskPriority | undefined): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].priority = priority;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskReminder(
    taskId: string,
    reminderTime: string | undefined,
    reminderNotificationId: string | undefined,
): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].reminderTime = reminderTime;
    tasks[idx].reminderNotificationId = reminderNotificationId;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

export async function updateTaskManualOrder(taskId: string, order: number): Promise<Task | null> {
    const tasks = await loadAllTasks();
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;

    tasks[idx].manualOrder = order;
    tasks[idx].updatedAt = now();
    await saveTasks(tasks);
    return tasks[idx];
}

// ─── Queries ───────────────────────────────────────────

export async function getAllTasks(): Promise<Task[]> {
    return loadActiveTasks();
}

export async function getAllTasksIncludingDeleted(): Promise<Task[]> {
    return loadAllTasks();
}

export async function getTodayTasks(): Promise<Task[]> {
    const tasks = await loadActiveTasks();
    const today = todayStr();
    return tasks.filter(
        (t) =>
            t.status !== 'closed' &&
            t.dueDate !== null &&
            t.dueDate <= today
    ).concat(
        tasks.filter(
            (t) => t.status === 'closed' && t.closedAt && isToday(parseISO(t.closedAt))
        )
    );
}

export async function getOpenTasks(): Promise<Task[]> {
    const tasks = await loadActiveTasks();
    return tasks.filter((t) => t.status === 'open');
}

export async function getOverdueTasks(): Promise<Task[]> {
    const tasks = await loadActiveTasks();
    const today = todayStr();
    return tasks.filter(
        (t) => t.status !== 'closed' && t.dueDate !== null && t.dueDate < today
    );
}

export async function getClosedTodayTasks(): Promise<Task[]> {
    const tasks = await loadActiveTasks();
    return tasks.filter(
        (t) => t.status === 'closed' && t.closedAt && isToday(parseISO(t.closedAt))
    );
}

export async function getTodayRescheduleCount(): Promise<number> {
    const today = todayStr();
    const records = await getItem<Record<string, { rescheduleCount?: number }>>(StorageKeys.DAILY_RECORDS);
    return records?.[today]?.rescheduleCount ?? 0;
}

/** Determine the integrity point type for closing a task */
export function getCloseType(task: Task): 'on_time' | 'late' | 'overdue' {
    if (!task.dueDate) return 'on_time';
    const now = new Date();
    const dueEnd = new Date(task.dueDate + 'T23:59:59');
    if (now <= dueEnd) return 'on_time';
    const hoursSinceDue = differenceInHours(now, dueEnd);
    if (hoursSinceDue <= 12) return 'late';
    return 'overdue';
}

/** Apply field changes to all open tasks in the same recurring series */
export async function updateRecurringSeries(
    taskId: string,
    changes: { title?: string; description?: string; priority?: TaskPriority | null; reminderTime?: string | null },
): Promise<void> {
    const tasks = await loadAllTasks();
    const anchor = tasks.find((t) => t.id === taskId);
    if (!anchor) return;
    const seriesId = anchor.recurrenceSourceId ?? anchor.id;
    const ts = new Date().toISOString();
    let changed = false;
    for (const t of tasks) {
        if (t.deletedAt || t.status === 'closed') continue;
        if (t.id !== taskId && t.recurrenceSourceId !== seriesId && t.id !== seriesId) continue;
        if (changes.title !== undefined) t.title = changes.title;
        if (changes.description !== undefined) t.description = changes.description.trim() || undefined;
        if (changes.priority !== undefined) t.priority = changes.priority ?? undefined;
        if (changes.reminderTime !== undefined) t.reminderTime = changes.reminderTime ?? undefined;
        t.updatedAt = ts;
        changed = true;
    }
    if (changed) await saveTasks(tasks);
}

/** Mark all past-due open tasks as overdue */
export async function markOverdueTasks(): Promise<void> {
    const tasks = await loadAllTasks();
    const today = todayStr();
    const ts = now();
    let changed = false;

    for (const t of tasks) {
        if (!t.deletedAt && t.status === 'open' && t.dueDate && t.dueDate < today) {
            t.status = 'overdue';
            t.updatedAt = ts;
            changed = true;
        }
    }

    if (changed) await saveTasks(tasks);
}
