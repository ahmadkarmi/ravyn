// Ravyn MVP — Core Type Definitions

export interface Tag {
  id: string;
  label: string;
  color: string;           // Hex color for display
  updatedAt?: string;      // ISO timestamp for sync
  deletedAt?: string | null; // Soft delete for sync
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | null;

export type TaskPriority = 'high' | 'medium' | 'low';

export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface Task {
  id: string;
  title: string;
  description?: string;    // Optional notes / context
  createdAt: string;       // ISO timestamp
  dueDate: string | null;  // YYYY-MM-DD (day-level)
  closedAt: string | null; // ISO timestamp when closed
  status: 'open' | 'closed' | 'overdue';
  rescheduledCount: number;
  tags?: string[];          // Array of Tag IDs
  recurrence?: RecurrenceType; // Auto-recreate on completion
  recurrenceSourceId?: string; // ID of the original recurring task
  priority?: TaskPriority;     // Optional urgency level
  reminderTime?: string;       // HH:mm local time for daily-reminder on dueDate
  reminderNotificationId?: string; // Scheduled notification identifier
  manualOrder?: number;        // User-defined sort order within section
  updatedAt?: string;      // ISO timestamp for sync
  deletedAt?: string | null; // Soft delete for sync
  appType?: string;        // Future: deep-link integration type
  appPayload?: object;     // Future: deep-link payload
}

export const TAG_COLORS = [
  '#E06C75', // Soft red
  '#E5A645', // Gold
  '#61AFEF', // Sky blue
  '#98C379', // Sage green
  '#C678DD', // Lavender
  '#56B6C2', // Teal
  '#D19A66', // Warm tan
  '#BE5046', // Burnt sienna
] as const;

export interface DailyRecord {
  date: string;            // YYYY-MM-DD
  closedCount: number;
  overdueAtEOD: number;
  rescheduleCount: number;
  integrityDelta: number;
  boostUsed: boolean;
  streakValue: number | null;
}

export interface UserState {
  streak: number | null;       // null until first closure ever
  integrityPoints: number;     // 0–THRESHOLD cycle; resets on boost earn
  boostTokens: number;         // Max 3
  onboardingComplete: boolean;
  startOfDay: string;          // "08:00" (HH:mm)
  endOfDay: string;            // "22:00" (HH:mm)
  pendingBoostOffer: boolean;  // Boost modal should show
  boostOfferTimestamp: string | null; // When boost was offered (for 24h auto-decline)
  lastProcessedDate: string | null;  // Last midnight processing date (YYYY-MM-DD)
  firstClosureEver: boolean;   // Track if user has ever closed a task
  streakGraceDate: string | null; // YYYY-MM-DD when grace was granted (1-day forgiveness)
}

export interface IntegrityEvent {
  type:
  | 'close_on_time'
  | 'close_late'
  | 'close_overdue'
  | 'daily_bonus'
  | 'clean_day'
  | 'overdue_penalty'
  | 'reschedule_penalty'
  | 'delete_overdue_penalty'
  | 'uncomplete_penalty';
  points: number;
  timestamp: string;
  taskId?: string;
}

export const INTEGRITY_POINTS = {
  CLOSE_ON_TIME: 10,
  CLOSE_LATE: 4,        // Within 12 hours
  CLOSE_OVERDUE: 2,     // >24hrs old
  DAILY_BONUS: 3,       // ≥1 close today
  CLEAN_DAY: 5,         // No overdue at EOD
  OVERDUE_PENALTY: -1,  // Per overdue item at EOD, cap -5
  OVERDUE_PENALTY_CAP: -5,
  RESCHEDULE_PENALTY: -2, // 3rd+ reschedule
  DELETE_OVERDUE: -3,
} as const;

export const BOOST_CONFIG = {
  THRESHOLD: 200,       // Integrity points needed per boost
  MAX_TOKENS: 3,        // Maximum stored boosts
  AUTO_DECLINE_HOURS: 24,
} as const;

export const RESCHEDULE_CONFIG = {
  FREE_PER_DAY: 2,      // First 2 are free
  HARD_CAP: 5,          // Max 5 per day total
} as const;

export const STREAK_MILESTONES = [7, 30, 90] as const;

export const DEFAULT_USER_STATE: UserState = {
  streak: null,
  integrityPoints: 0,
  boostTokens: 0,
  onboardingComplete: false,
  startOfDay: '08:00',
  endOfDay: '22:00',
  pendingBoostOffer: false,
  boostOfferTimestamp: null,
  lastProcessedDate: null,
  firstClosureEver: false,
  streakGraceDate: null,
};
