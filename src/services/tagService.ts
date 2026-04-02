// Ravyn — Tag CRUD Service

import * as Crypto from 'expo-crypto';
import { Tag, Task, TAG_COLORS } from '../types';
import { getItem, setItem, StorageKeys } from './storageService';

export const MAX_TAGS = 20;

// ─── Helpers ───────────────────────────────────────────

async function loadAllTags(): Promise<Tag[]> {
    return (await getItem<Tag[]>(StorageKeys.TAGS)) ?? [];
}

async function loadActiveTags(): Promise<Tag[]> {
    const all = await loadAllTags();
    return all.filter((t) => !t.deletedAt);
}

async function saveTags(tags: Tag[]): Promise<void> {
    await setItem(StorageKeys.TAGS, tags);
}

function now(): string {
    return new Date().toISOString();
}

// ─── CRUD ──────────────────────────────────────────────

export async function getAllTags(): Promise<Tag[]> {
    return loadActiveTags();
}

export async function getAllTagsIncludingDeleted(): Promise<Tag[]> {
    return loadAllTags();
}

export async function getTagById(tagId: string): Promise<Tag | null> {
    const tags = await loadActiveTags();
    return tags.find((t) => t.id === tagId) ?? null;
}

export async function getTagsByIds(tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) return [];
    const tags = await loadActiveTags();
    const idSet = new Set(tagIds);
    return tags.filter((t) => idSet.has(t.id));
}

export async function createTag(label: string, color?: string): Promise<Tag> {
    const tags = await loadAllTags();
    const active = tags.filter((t) => !t.deletedAt);

    if (active.length >= MAX_TAGS) {
        throw new Error(`Tag limit reached (max ${MAX_TAGS})`);
    }

    const trimmed = label.trim();
    const duplicate = active.find((t) => t.label.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return duplicate;

    const usedColors = new Set(active.map((t) => t.color));
    const unusedColor = TAG_COLORS.find((c) => !usedColors.has(c));
    const nextColor = color ?? unusedColor ?? TAG_COLORS[active.length % TAG_COLORS.length];

    const ts = now();
    const tag: Tag = {
        id: Crypto.randomUUID(),
        label: trimmed,
        color: nextColor,
        updatedAt: ts,
    };
    tags.push(tag);
    await saveTags(tags);
    return tag;
}

export async function updateTag(tagId: string, updates: Partial<Pick<Tag, 'label' | 'color'>>): Promise<Tag | null> {
    const tags = await loadAllTags();
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx === -1) return null;

    if (updates.label !== undefined) tags[idx].label = updates.label.trim();
    if (updates.color !== undefined) tags[idx].color = updates.color;
    tags[idx].updatedAt = now();

    await saveTags(tags);
    return tags[idx];
}

export async function deleteTag(tagId: string): Promise<Tag | null> {
    const tags = await loadAllTags();
    const idx = tags.findIndex((t) => t.id === tagId);
    if (idx === -1) return null;

    const ts = now();
    tags[idx].deletedAt = ts;
    tags[idx].updatedAt = ts;
    await saveTags(tags);

    // Strip orphaned tag ID from all tasks
    const tasks: Task[] = (await getItem<Task[]>(StorageKeys.TASKS)) ?? [];
    let dirty = false;
    for (const task of tasks) {
        if (task.tags?.includes(tagId)) {
            task.tags = task.tags.filter((id) => id !== tagId);
            if (task.tags.length === 0) task.tags = undefined;
            task.updatedAt = ts;
            dirty = true;
        }
    }
    if (dirty) await setItem(StorageKeys.TASKS, tasks);

    return tags[idx];
}
