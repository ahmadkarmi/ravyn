/**
 * Local-timezone date utilities.
 *
 * IMPORTANT: Always use these helpers instead of `toISOString().split('T')[0]`,
 * which returns UTC and drifts from the user's local date near midnight.
 */

/** Returns the local date as 'YYYY-MM-DD'. */
export function localDateStr(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Returns tomorrow's local date as 'YYYY-MM-DD'. */
export function localTomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return localDateStr(d);
}

/** Returns a local date N days from now as 'YYYY-MM-DD'. */
export function localDaysFromNow(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return localDateStr(d);
}
