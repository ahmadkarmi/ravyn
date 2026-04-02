Important information (save to your memory and execute accordingly): This document is the single source of truth for the Ravyn project. It contains the product requirements, design specifications, and technical documentation for the project. It is a living document and will be updated as the project evolves. As you proceed, you will be asked to update this document with your findings and decisions as well as any other technical documentation you generate or change (add or remove or edit). This document by the end of development will act as the user manual for the application.

Ravyn MVP: Core Execution Engine

Problem

Chronic starters with execution anxiety are unable to consistently close tasks, despite being capable and motivated. Instead, they are paralyzed by overwhelming, ever-growing to-do lists in traditional productivity apps, which amplify feelings of guilt and failure. Existing solutions cater to planning and task accumulation, not daily execution, creating a business opportunity to deliver a behavioral scaffold app built for action, with retention fueled by streak mechanics and integrity tracking.



High Level Approach

We will solve this by building an ultra-minimal daily execution engine: users must close at least one task before midnight—nothing else is required. Planning, collaboration, and complex workflows are stripped away. Core behavioral mechanisms—streaks (discipline), integrity points (quality), and earned Boost tokens (forgiveness)—shape user action, not management, resulting in a radical focus on daily, measurable progress.



Narrative

Common Use Case

Sarah, 35, Burnt-Out PM:
Sarah has 247 tasks in Notion. Every morning, she plans but never meaningfully progresses. Most apps offer more features—tags, dependencies, grouping—which make her task list feel even heavier. Using Ravyn, she sees only a few commitments. She closes one critical task—"Email vendor"—before midnight, extending her streak. She feels lighter, not overwhelmed.

Edge Case

Marcus, 28, Diagnosed ADHD:
Marcus struggles to prioritize with endless lists, often paralyzed by choice and noise. In Ravyn, the empty interface is calming. He's reminded just once per day to close anything—so he marks "Order refills" as done. On a bad day, he misses closure, but the next morning Ravyn offers a Boost token he earned through consistency, allowing him to preserve his streak. He doesn't feel punished or shamed.

Before/After

Lisa, 40, Productivity App Hopper:
Before Ravyn: Lisa downloads new to-do apps every month, hoping a new system will break her inertia. Custom views and integrations only bury her further. After Ravyn: Lisa now checks Ravyn each night. She’s proud of her 11-day streak. The sense of accomplishment is clear and guilt-free. She finds satisfaction in the one-rule simplicity.



Goals

Measurable Goals





40% of users maintain a 7-day streak, from a current baseline of ~0%.



60% daily active retention at day 30, up from <30% on traditional task apps in this segment.



Average of 4.2 tasks closed per user per week.

Immeasurable Goals





Users should feel relief, not guilt, at day's end.



The app should feel like a coach, not a nag.



Streaks should create a sense of pride, never pressure.



Metrics

North Star Metric





Metric: 7-day streak retention rate



Current baseline: 0%



Target: 40%



Measurement: Percentage of active users who maintain a 7-day closure streak, measured via daily catch in app backend analytics.

Secondary Metrics





Daily close rate: 60% (from baseline 25%) → Target 60%



Integrity points growth: Target 150 points per user/month (baseline N/A; measured post-launch)



Boost usage rate: Target 25% of eligible missed-closure events result in Boost application

Guardrail Metrics





Notification opt-out rate: Must stay below 15%





15% would signal intrusiveness, and require rollback on notification cadence.



Day-1 churn: Must stay below 40%



Any increase above this is unacceptable and would demand onboarding redesign.



Gaming detection:





Task quality score: Flag users whose average task title length is less than 5 characters.



Instant closure rate: Flag if over 50% of user's tasks are closed within 1 minute of creation.



Reschedule churn: Flag users who reschedule more than 3 times/day for 7 or more consecutive days.



Impact Sizing Model

Calculation





Productivity app market install base (US + global): 40M users/year (source: App Annie/Mobile Action, 2022)



TAM for “chronic starters” segment: ~2% of market = 800,000 prospective users



Initial Year-1 user target (MVP reach + beta waitlist): 10,000 installs



7-day streak success: 40% of users = 4,000 retained users at week 1



Paid tier conversion: 25% of streakers = 1,000 paid users



ARPU: $4/month
Annual gross revenue: 1,000 × $4 × 12 = $48,000



Customer Acquisition Cost (CAC): Estimate $8/user from paid/organic blend = $80,000 for 10,000 users.



CAC for high-intent verticals and influencer word-of-mouth can drop to $5/user, with upside to economics at full scale.

Sensitivity Analysis





If 7-day streaks hit only 25% (not 40%): 2,500 streakers × 25% = 625 paid = $30,000/year.



If paid conversion rises to 35%: 1,400 × $4 × 12 = $67,200 gross revenue.



If CAC increases to $12/user: Breakeven delayed until 18–24 months.

Revenue/Bottom-Line Impact





Estimated MVP-year revenue: $48,000 (at target adoption/retention/conversion)



Confidence: Medium (dependent on retention and engaged user pool size)



Key assumptions:





High retention via streak mechanic



Willingness to pay for high-integrity execution tracking



Organic word-of-mouth reduces long-term acquisition spend



Non-goals





Not doing: Project management, subtasking, task assignment
Why: Adds complexity, distracts from MVP focus: daily closure.



Not doing: Collaborator access, comments, shared workspaces
Why: Social features complicate privacy and increase scope.



Not doing: Templates, calendar sync
Why: Templates and calendar sync add complexity outside MVP behavior loop. (Recurring tasks are now implemented — see Change Log 2026-02-15.)



Not doing: Voice assistants (Siri/Google), desktop clients, time tracking
Why: Platform expansion only considered once core mobile loop is proven.



Solution Alignment

What's In





Manual task entry and closure experience



Streak engine with midnight processing and local timezone handling



Integrity scoring (positive/negative event model, daily caps)



Boost tokens (earned, not purchased) and streak protection



Pre-set limited daily push notification system (max 3 per day)



End-of-day review screen

What's Out





Third-party deep link integrations (Phase 1)



Advanced notification/priority controls



Social/accountability features



Analytics dashboard



Desktop/web versions

Open Questions





How much personalization to offer on notification timing (sliders, ranges, preset options)?



Should Boost cap be 2 or 3 tokens for optimal forgiveness-vs-scarcity balance?



Key Features: Plan of Record







Feature



Priority



Description



Size





Task creation & close



P0



Fast add, simple label, instant close; the single fundamental action



M





Streak counter logic



P0



At midnight, streak increments if ≥1 closure; clear, visible on home



M





Integrity engine



P0



Awards/deducts points per closure/reschedule/overdue; powers Boosts



M





Boost token system



P0



Earn, bank, and consume tokens to protect streak; single-use, no stacking



M





Basic notifications



P0



3/day rhythm: morning nudge, single due reminder, pre-midnight warning



M





Daily review screen



P0



“Closed today”, “Open”, “Overdue”—all managed via single screen



M





Timezone/clock logic



P1



Ensures accurate local streak/midnight handling



S





Overdue backlog view



P1



Separate tab to review/close legacy commitments



S





Notification settings



P1



Initial customization; e.g., select start/end of day, define quiet hours



S





Streak/integrity graph



P2



Weekly/monthly streak/integrity history visibility



S



Future Considerations

Planned Follow-ups





Deep link integrations: (Phone, SMS, WhatsApp, email, maps) — Phase 1; unlock “do and close” natively



Recurring tasks/calendar: (Phase 2) — Only for power users if retention is strong



Desktop/web app: (Phase 2) — Broaden platform footprint post-core validation



Social accountability/team: (Phase 3) — Streak sharing, team mode for advanced use cases

Build-Now Implications





Commitment data model MUST include fields for app_type and app_payload to support integrations



Notification system must support modular push types for expansion later (deep links, batch, etc.)



All time/date logic must be parameterized for future web/desktop expansion



Integrity and Boost logic must be idempotent for safe re-processing and analytics



Enhanced Key Flows

Flow: First Task Creation to Streak Start





Screen: Onboarding





User sees: App philosophy, start/end of day optional (defaults: 8:00 AM/10:00 PM), permission request for notifications





If notification permission denied: In-app banner appears, "Turn on notifications to get reminders." User not penalized.



User does: Creates first commitment



Result: Task appears on home



After closing first task: Tooltip: "You earned +10 Integrity Points for closing on time. Earn 200 to unlock a Boost Token."



Screen: Home / Today View





User sees: Streak shown as "—" (null) until first task is closed, Boosts (0), Integrity (0)



User can tap: Integrity counter for explainer modal showing scoring, path to next Boost



Screen: Midnight Processing





System: If at least one closure, streak increments to 1.





If user has never closed a task, streak remains "—" (null)

Flow: Daily Execution — Morning to Evening





Screen: Home — Morning





User sees: “Today: X commitments.” Streak, integrity, boosts



Screen: Due Reminder





If multiple tasks due in same 30-min window: Batched notification:





"3 commitments due soon: Call mom, Email vendor, Order refills" (max 3 pushes/day)



Screen: End of Day





Notification timing: Sent 1 hour before user's selected end_of_day_time



If 0 closed: "No tasks closed today." Final opportunity to act.

Flow: Streak Protection (Boost)





Screen: Home — Missed Day, Next Morning





User sees: “Streak ended. Use Boost?” modal





If modal dismissed or app backgrounded: Modal persists until a choice is made.



If abandoned for 24 hours: Auto-declines, streak resets to 0; log both offer and final decision.



User does: Accepts — 1 boost consumed, streak is preserved. Declines — streak resets.

Flow: Streak Reset/Recovery





Screen: Home — After Streak Loss





User sees: Streak = 0, gentle messaging “Start again tomorrow”



User does: Adds/marks new closure when ready



Milestone Celebrations:





At 7-day, 30-day, 90-day streaks: Modal congratulates user (e.g., "7-day streak! You're building discipline.")

Flow: Daily Review





Screen: Daily Review





Sections: Closed Today, Open, Overdue. Each open item: close, reschedule, or leave open.



Integrity explainer: Tap Integrity points to see breakdown and next-Boost info.



Key Logic

Streak Calculation





Rule: Streak increments at server-calculated local midnight if at least one commitment closed (on time or late).





If no task ever closed: Streak stays "—" (null) until first closure.



Handles: Device timezone change—server calculates midnight in user's current timezone.



If offline at midnight: Logic processes next app open using server-side daily_records.



Example: Task closed at 11:59 PM (local), streak +1; at 12:01 AM, counts toward next day.

Boost Eligibility & Use





If closed_count_today = 0 and boost_tokens > 0: Offer Boost at next login as modal; persists until choice, re-appears if backgrounded, auto-declines after 24 hrs.



Max 3 stored; no stacking or purchase.

Integrity Points — Single-Counter Earn Cycle

Integrity points track progress toward the next Boost Token. Points cycle from 0 to 200 (BOOST_CONFIG.THRESHOLD). When 200 is reached, a boost is awarded and the counter resets with any remainder carried over. If all 3 boost slots are full, points freeze at 200 — the user must spend a boost to resume earning. Penalties always apply regardless of boost count.

Positive:

Close on time: +10

Close late within 12 hours: +4

Close overdue (>24hrs old): +2

Daily execution bonus (≥1 close): +3

Clean day (no overdue at EOD): +5

Negative:

Each overdue open at EOD: -1 (cap -5/day)

Reschedule beyond 2/day: -2 for each additional (1st and 2nd are free, hard cap at 5 reschedules/day; after 5, reschedule button disabled for day)

Delete overdue task: -3

Rules:

Integrity never goes below 0

Points auto-convert at 200 → +1 boost token, remainder carries over

At max boosts (3), points cap at 200 (frozen until a boost is spent)

Penalties still deduct even when frozen (e.g., 200 → 195 after -5 overdue penalty)

UI shows progress bar (0–200) on the Integrity tile across all screens

Notification Suppression & Batch Logic





Max 3 pushes/day (morning, due, end-of-day).



Permission denied: In-app fallback banner. No streak penalty.



Multiple due within 30 min: Batched reminder summarizing all commitments.



End-of-day warning: Sent at user-selected end_of_day_time minus 1 hour.



Launch Plan

Phases

Private Beta — Validation





Entry criteria: Core flow, notifications, streak/integrity/boost logic in place; dogfood stress-tested



Users: 50 (founders, friends, motivated segment reps)



Duration: 2 weeks



Exit: >30% users hit 7-day streak; critical bugs resolved

Open Beta — Learning at Scale





Entry criteria: All P0 features stable from private



Users: 500 real users (waitlist, organic social)



Duration: 4 weeks



Exit: 35% or better week-1 streak, core retention metrics hit

Public Launch





iOS First: App Store live, escalate PR, support



Android: 2 weeks later, after initial stabilization

Experiment Design





Beta type: Invite-only, daily check-ins



Sample: 50/500; metrics tracked in Mixpanel/Postgres



Duration: 2+4 weeks



Criteria: 7-day streak rate, open rates, notification opt-outs guide full rollout

Risks & Dependencies





Risks: Notification opt-in, timezone bugs, background (midnight) task failures, data consistency, gaming/theming behavior



Dependencies: APNs (iOS), FCM (Android), Render-managed backend, analytics stack



Contingencies: Manual backup for streak correction, over-the-air bugfixes, notification fallbacks



Key Milestones







Milestone



Date



Owner



Status





Design complete



[2024-07-01]



[Designer]



Planned





API/data model finalized



[2024-07-07]



[Backend]



Planned





Core streak engine built



[2024-07-21]



[Backend]



Planned





Integrity/boost integrated



[2024-07-28]



[Backend]



Planned





Daily notification system live



[2024-07-28]



[Mobile]



Planned





Internal dogfood (7-day test)



[2024-07-29]



[Team Lead]



Planned





Private beta launch



[2024-08-05]



[PM]



Planned





Open beta



[2024-08-19]



[PM]



Planned





App Store submission



[2024-09-09]



[Mobile]



Planned





Public launch iOS



[2024-09-16]



[PM]



Planned





Public launch Android



[2024-09-30]



[PM]



Planned

Dependencies





API/data model must be ready before mobile integration.



Dogfood requires all P0 features stable.



Public launch blocked on successful open beta completion and App Store approval.



Build MVP with roadmap in mind:
From day one, data models must support future integrations (deep links), and notification/logic systems must be extensible for later phases. Hard MVP focus on minimal surface, but ready for expansion.

---

Design & UX Spec — v1 (Implemented)

Date: 2026-02-13

Experience Principles

- Ravyn should feel like a calm execution coach, not a pressure engine.
- Primary focus is one daily meaningful closure.
- Feedback should be supportive and direct, never shaming.
- Visual system should use shared tokens (color + typography), not ad-hoc hardcoded styling in core flows.

Screen Contracts (Current)

1) Onboarding
- Tone updated to supportive coaching language.
- Removed failure-heavy phrasing in core step copy.
- Default day window aligned to MVP defaults: 08:00 start, 22:00 end.

2) Home / Today
- Home is execution-only: active tasks (Open + Overdue) are prioritized.
- Header greeting is time-aware (morning/afternoon/evening/night).
- Core supporting line: “Close one meaningful thing today.”
- Empty state emphasizes gentle momentum instead of completion finality.

3) Daily Review
- Information architecture aligned to plan-of-record:
  - Closed Today
  - Open
  - Overdue
- Review header copy emphasizes clarity and rescue workflow.
- Closed-task sections use progressive disclosure to avoid list overload at high volume.
- Users can review older completions via an "Earlier Closures" section with load-more/collapse controls.
- Closed sections (today/history) are collapsed by default and expanded intentionally for review to reduce visual noise.
- Review content is displayed as separated section cards (not tightly stacked list rows) to improve vertical rhythm.

4) Navigation
- Bottom tabs use semantic icons (Today, Review, Profile) instead of abstract glyph shapes for faster recognition.

5) Profile & Task Detail
- Profile now uses theme-consistent surfaces and safer account actions (explicit confirmation before onboarding reset).
- “Reset all data” labeling was clarified to “Restart onboarding” to match actual behavior.
- Task detail language is more explicit and calm (e.g., “Mark as Open”, “Delete task permanently?”).

6) Full Visual Redesign Layer
- All primary screens now use a consistent atmospheric visual language (soft ambient background shapes + elevated card surfaces + semantic icon rhythm).
- Today/Home and Review were redesigned to improve hierarchy (hero metrics card, clearer section headers, better visual grouping) without altering task/integrity logic.
- Login and Onboarding were redesigned with stronger onboarding/auth hierarchy while preserving auth, notifications, and first-task flows.
- Navigation now uses a floating glass tab container treatment for improved affordance and premium feel.
- Add Task sheet and task cards were redesigned for consistent micro-interactions and theme-token-based chips/surfaces.

Component-Based Design System (`src/components/ds/`)

All UI primitives are now exported from a shared `ds/` directory with typed variant props. Screens consume these components instead of hand-styling Views inline.

- **Card** (`Card.tsx`) — Base surface container.
  - Variants: `elevated` (default, shadow), `filled` (surface bg, no shadow), `outlined` (border, no shadow).
  - Default padding: 20px, border radius: `borderRadius.xl` (20).
  - Usage: Focus card (Home), Profile card, Calendar card (Review), Settings sections (Profile), Action Board (Review).

- **Chip** (`Chip.tsx`) — Tinted pill for stats, meta, and status.
  - Variants: `tinted` (default, color+14 hex bg), `solid` (full color bg, white text).
  - Sizes: `sm` (compact meta), `md` (default stats).
  - Props: `color`, `icon?`, `value?`, `label?`.
  - Usage: HUD chips (Home), stat chips (all screens), meta pills (TaskCard), status badge (TaskDetailSheet).

- **Badge** (`Badge.tsx`) — Count indicator pill.
  - Props: `count`, `color`.
  - Usage: Section count badges (Home), day count (Review), action board counts (Review).

- **IconBox** (`IconBox.tsx`) — Tinted icon container for card titles and menu rows.
  - Sizes: `sm` (28px, card titles), `md` (34px, menu items), `lg` (40px).
  - Props: `icon`, `color`, `size?`.
  - Usage: Card title rows (Home, Review), menu item icons (Profile).

- **layout** (`layout.ts`) — Semantic spacing constants built on top of the base spacing scale.
  - Screen-level: `screenPaddingX` (16), `screenTopGap` (24), `screenBottomPad` (120).
  - Card: `cardPadding` (20), `cardRadius` (20), `cardShadow`, `cardGap` (12).
  - Section: `sectionGap` (16), `sectionHeaderGap` (8).
  - Chip: `chipGap` (8).
  - Sheet: `sheetRadius` (20), `sheetHandleWidth` (36), `sheetHandleHeight` (4).
  - FAB: `fabSize` (54), `fabRadius` (27), `fabRight` (24).
  - Avatar: `avatarSm` (38), `avatarMd` (56), `avatarLg` (76).
  - IconBox: `iconBoxSm` (28), `iconBoxMd` (34), `iconBoxLg` (40).
  - Micro: `hairline` (1), `microGap` (2).
  - Usage: All screens and DS components reference `layout` for consistent spatial rhythm instead of hardcoded numbers.

Spacing Scale (`src/theme/index.ts`)

- `2xs: 2` — micro adjustments, hairline gaps
- `xs: 4` — tight inner gaps
- `sm: 8` — chip gaps, row gaps
- `md: 12` — card gaps, medium padding
- `lg: 16` — screen padding, section gaps
- `xl: 24` — screen top gap, large spacing
- `xxl: 32` — hero block padding
- `xxxl: 48` — scroll content bottom padding

Typography Modernization

- `headlineLarge` and `headlineMedium` switched from serif (Georgia) to sans-serif (System) for a cleaner, more modern feel.
- `displayLarge`, `displayMedium`, `h1`, `h2` remain serif for brand personality on hero text.
- Added `letterSpacing: -0.3` to `headlineLarge` and `-0.2` to `headlineMedium` for tighter, modern typographic rhythm.

Design System Contract (Current)

- `error` is a first-class semantic color token in light/dark palettes.

Known Product Behavior Decisions

- Task toggle actions (close/uncomplete) are wired directly from task cards and detail sheet to preserve interaction consistency.
- Reschedule from task detail uses service-level reschedule APIs and enforces existing daily limit behavior.

---

Change Log

- 2026-02-13 — UX pass A/B started and applied to core experience:
  - Onboarding tone and day-window defaults refined.
  - Home flow refocused on active commitments and supportive coaching language.
  - Daily Review restructured to Closed Today / Open / Overdue.
  - Tab bar semantics improved with clear iconography.
  - Core design token coverage stabilized for error state + legacy typography compatibility.
- 2026-02-13 — UX polish pass continued:
  - Profile screen visual consistency improved (theme-driven cards, avatar treatment, metric panel colors).
  - Profile action safety improved via explicit confirmation for onboarding restart.
  - Task detail sheet wording refined for clarity and lower friction.
  - Empty state styling aligned to current typography tokens.
  - Login auth copy/diagnostic messaging cleaned for production readability.
- 2026-02-13 — Full page redesign pass:
  - Redesigned all primary pages (Onboarding, Login, Home, Review, Profile) using unified ambient background + elevated card visual system.
  - Upgraded tab bar to floating glass card presentation while preserving tab behavior.
  - Refined Home with a dedicated “Daily Focus” hero metrics card and section count chips.
  - Refined Review with card-based section headers and improved visual grouping.
  - Refined Add Task sheet and TaskCard styling for cleaner hierarchy and stronger consistency with theme tokens.
  - Loading state redesigned to match the new branded visual language.
- 2026-02-13 — Daily Review iteration:
  - Rebalanced Review counters into a two-row card grid to fix horizontal imbalance and improve scanability.
  - Added visual spacing/segmentation between header counters and task sections.
  - Added “Earlier Closures” section so previously closed tasks remain reviewable beyond same-day recency.
- 2026-02-13 — Daily Review scalability update:
  - Added pagination-style progressive disclosure for Closed Today and Earlier Closures lists.
  - Added visible/total counters and section-level "Show more" / "Collapse" controls.
  - Preserved close/uncomplete/review behaviors while preventing large closed-task dumps.
- 2026-02-13 — Daily Review layout overhaul:
  - Replaced tightly stacked SectionList rendering with spaced section-card blocks for a cleaner experience.
  - Added collapsed state hint + explicit "Review" action for closed-task sections.
  - Increased spacing between section headers and task cards to avoid the "stuck together" feel.
- 2026-02-13 — Daily Review controls refinement:
  - Expanded closed sections now always expose a "Collapse" action (not only at list end).
  - "Show more" and "Collapse" can coexist, giving immediate control without extra scrolling.
- 2026-02-13 — Daily Review date access refinement:
  - Replaced the subtle calendar chip with a prominent full-width date selector row.
  - Added explicit "Open calendar / Hide calendar" affordance directly in the header area.
- 2026-02-13 — Component-based design system & modernization:
  - Created `src/components/ds/` with reusable Card, Chip, Badge, IconBox components with typed variant props.
  - Refactored HomeScreen, ProfileScreen, ReviewDashboardScreen to consume DS components instead of inline styled Views.
  - Refactored TaskCard meta pills and TaskDetailSheet status badge to use DS Chip component.
  - Modernized typography: switched `headlineLarge` and `headlineMedium` from serif to sans-serif.
  - Unified border radius to `borderRadius.xl` (20) for all cards via Card component.
  - Removed ~120 lines of duplicated chip/badge/card styling across screens.
- 2026-02-13 — Spacing integrated into design system:
  - Added `spacing['2xs']` (2px) token to the base scale for micro adjustments.
  - Created `layout.ts` in `ds/` with semantic spacing constants (screenPaddingX, cardPadding, sectionGap, chipGap, fabSize, avatarLg, etc.).
  - Updated all DS components (Card, Chip, Badge, IconBox) to use spacing/layout tokens instead of magic numbers.
- 2026-02-21 — Comprehensive Logic Audit & Bug Fixes:
  - **Fix 1 (Critical)** `declineBoost` now clears `streakGraceDate`. Previously a stale grace date persisted after decline, causing the new streak's first missed day to immediately reset instead of getting its grace period.
  - **Fix 2 (Critical)** `checkAutoDeclineBoost` now runs *before* `processDays` in `HomeScreen.loadData`. Previously stale offers (>24h) weren't declined until after days were processed, leaving missed days incorrectly shielded.
  - **Fix 3 (Critical)** Boost-pending offer no longer grants infinite streak protection. Previously `pendingBoostOffer=true` caused all subsequent missed days to fall through neither the grace nor reset branch. Now: the pending offer covers exactly one day; subsequent missed days get normal grace→reset treatment.
  - **Fix 4 (Critical)** Daily bonus (+3), clean day bonus (+5), and overdue penalty (−1/item, cap −5) are now applied inside `processDays` for each historically processed day. These mechanics existed in `integrityService` but were never called — now wired inline with boost-conversion logic after each day's streak calculation.
  - **Fix 5 (Critical)** `pullUserState` merge: `lastProcessedDate` now takes `max(local, remote)` — whichever device processed more recently wins, preventing re-processing of already-handled days on the next app open.
  - **Fix 6 (Critical)** `pullUserState` merge: streak is now authoritative based on `lastProcessedDate` ownership. The device with the more recent `lastProcessedDate` owns the streak value; equal dates fall back to `Math.max`. This allows legitimate server-side streak resets to propagate correctly.
  - **Fix 7 (Critical)** Added `pullDailyRecords()` to sync. Previously daily records were push-only; on a fresh install or second device, `processDays` had no closure history → streak always reset to 0.
  - **Fix 8 (Medium)** `pushTasks`/`pullTasks` now sync `priority`, `reminderTime`, `reminderNotificationId`, and `manualOrder`. DB migration `add_task_sync_fields` applied. These four fields were local-only before.
  - **Fix 9 (Medium)** `spawnRecurringTask` now inherits `priority` and `reminderTime` from the closed task. Recurring tasks no longer lose their configuration on each spawn.
  - **Fix 10 (Medium)** `getNextDueDate` now uses `date-fns` `addDays`/`addWeeks` instead of raw millisecond arithmetic, fixing incorrect next-occurrence dates on DST transition days.
  - **Fix 11 (Low)** `rescheduleTask` now rejects dates in the past (`reason: 'past_date'`), preventing tasks from being immediately re-overdue on reschedule.
  - **Tests** Updated `streakService.test.ts`: `declineBoost` asserts `streakGraceDate=null`; added boost-infinite-protection regression test; added integrity delta assertions for daily bonus, clean day, and overdue penalty.
- 2026-02-21 — Integrity Circular Progress Ring (Review Screen):
  - Added `progressRing?: number` (0–1) prop to `StatTile` DS component. When provided, renders a 34×34 SVG ring around the icon using `react-native-svg` — track circle (border color) + fill circle (tile color) with `strokeDashoffset` and `strokeLinecap="round"` starting from 12 o'clock.
  - Wired onto the Integrity tile in `ReviewDashboardScreen`: `progressRing={(integrityPoints) / BOOST_CONFIG.THRESHOLD}` (200 pts threshold). Ring fills as the user earns integrity points toward their next boost token.
  - `BOOST_CONFIG` imported into `ReviewDashboardScreen` to derive the ratio.
- 2026-02-21 — Streak Engine Bug Fix (`streakService.ts`):
  - **Root cause**: `processDays()` set `lastProcessedDate = today` after each run, but the processing cutoff was `yesterday`. This meant the processing window was always empty for daily users (cursor started at today, cutoff was yesterday → loop never ran). Streak only incremented when a user skipped a day, creating a 2+ day gap.
  - **Fix**: Changed `lastProcessedDate` to be set to `yesterday` (the actual cutoff) instead of `today`. Updated the early-exit guard from `=== today` to `>= yesterday`. First-ever-run now also sets baseline to `yesterday` so Day 2 correctly processes Day 1's closures.
  - **DB fix**: Corrected affected user's streak from 0 → 3 (reflecting Feb 18–20 consecutive closure days) and reset `last_processed_date` to `2026-02-20` so the engine resumes correctly from tomorrow.
  - **Test**: Updated `streakService.test.ts` first-ever-run assertion from `today` → `yesterday`.
  - **Review screen**: Added `subtitle="Active today"` to the Day Streak `StatTile` when `closedToday > 0`, providing a visual cue that today's session is contributing to tomorrow's streak count.
- 2026-02-21 — Review vs Calendar Differentiation (Option A — True Differentiation):
  - **ReviewDashboardScreen** is now the pure productivity/analytics screen: subtitle changed to "Your productivity at a glance". StatTile grid replaced to show `Closed Today`, `7-Day Closures`, `Day Streak`, and `Integrity` (points). `UserState` is loaded alongside tasks on every focus to keep streak/integrity live. Dead `filterTagId` state and unused `tagFilterSection`/`tagFilterRow` styles removed. Unused imports (`Chip`, `PressableScale`, `shadows`, `INFO_CONTENT`) cleaned up. Week heatmap calendar, day-closure detail, and 7-Day Trends accordion retained — all exclusively retrospective/analytics content.
  - **CalendarScreen** is now the pure task-browser/scheduler screen: subtitle changed to "Plan & manage your schedule". `StatTile` grid and `stats` useMemo removed — the screen no longer shows productivity metrics, only scheduled tasks. `StatTile`, `TileGrid` removed from imports. Month grid with task-status dots (overdue/open/closed), tag filter, and full day task list (all statuses) retained. The Calendar is now clearly about *what* and *when*, while Review is about *how well*.
- 2026-02-20 — Full Design System Audit (HomeScreen, CalendarScreen, ReviewDashboardScreen):
  - Migrated all empty states to use the centralized `EmptyState` DS component.
  - Migrated tag filter chips on all main screens to use the `Chip` DS component.
  - Removed all hardcoded spacing (`gap: 8`, `margin: 16`, etc.) in favor of semantic `layout.*` and `spacing.*` tokens across the three primary screens.
  - Aligned `CalendarScreen` to match `ReviewDashboardScreen` visually: added backdrop orbs, DS `Card` wrappers, and `StatTile` grids.
  - Updated HomeScreen, ProfileScreen, ReviewDashboardScreen to reference `layout` constants for consistent spatial rhythm.
  - Unified Header typography across all main screens (HomeScreen, ReviewDashboardScreen, CalendarScreen, ProfileScreen) to strictly use `typography.h1` for titles and `typography.bodyMedium` for subtitles, fixing a discrepancy where the home screen greeting was styled differently.
  - All spacing decisions now traceable to either the base scale or the layout constants file.
  - Added haptic feedback (`Haptics.impactAsync`) to the week navigation arrows and swipe gestures in the Review screen calendar grid.
  - Added swipe gestures (`calendarPan`) and haptics to the `CalendarScreen` month grid to match the interaction pattern of the Review screen week calendar.
- 2026-02-13 — Task Tagging & Categorization:
  - **Data model**: Added `Tag` interface (`id`, `label`, `color`), `TAG_COLORS` palette (8 colors), and optional `tags?: string[]` field to `Task` interface in `src/types/index.ts`. Added `TAGS` storage key to `storageService.ts`.
  - **TagService** (`src/services/tagService.ts`): Full CRUD for tags with AsyncStorage persistence. Features: case-insensitive duplicate prevention, smart color assignment (avoids recently-used colors), soft cap of 20 tags, atomic orphan cleanup on delete (strips deleted tag ID from all tasks).
  - **TaskService updates**: `createTask` accepts optional `tags` param. New `updateTaskTags` function for modifying tags on existing tasks.
  - **AddTaskSheet**: Horizontal scrollable tag picker with toggle chips, inline "Add a tag" / "New" creation, haptic feedback on selection. Handles duplicate-safe and tag-limit-safe creation via try/catch.
  - **TaskCard**: Displays up to 2 color-coded tag pills inline; shows "+N" overflow indicator for 3+ tags.
  - **TaskDetailSheet**: Displays tag pills below title (synced with live editing state). Collapsible "Tags" editor section with toggle chips, inline new tag creation, and haptic feedback. Changes persist immediately via `onTagsChange` callback.
  - **HomeScreen**: Tag filter bar below Daily Focus card (horizontal scroll, "All" + per-tag chips). Filters task sections by selected tag. Context-aware empty state ("No tasks with this tag" vs generic). Stale filter auto-cleared when tag is deleted elsewhere.
  - **ReviewDashboardScreen**: Same tag filter bar pattern below stats chips. Filters closed-on-day, action board, and upcoming task lists. Stale filter auto-cleared on data load.
  - **ReviewScreen**: Passes `allTags` to `TaskCard` for tag display.
  - **ProfileScreen — Manage Tags section**: Lists all tags with color swatch (tappable to cycle through 8 colors with palette icon hint), inline-editable label (tap to rename), task count badge per tag, and delete button with confirmation dialog. Supports inline new tag creation. Tags load alongside tasks for accurate count computation.
- 2026-02-13 — Offline-First Storage & Cloud Sync:
  - **Root cause fix**: Replaced `uuid` package with `expo-crypto`'s `randomUUID()` in `taskService.ts` and `tagService.ts`. The `uuid` package requires `crypto.getRandomValues()` polyfill on React Native which was missing, causing silent task creation failures on mobile. `expo-crypto` uses native crypto and works reliably on all platforms.
  - **Error handling**: Added try/catch to `handleAddTask` in HomeScreen with user-facing toast on failure.
  - **Sync tracking fields**: Added `updatedAt` (ISO timestamp) and `deletedAt` (soft delete) to `Task` and `Tag` interfaces. All mutation functions now stamp `updatedAt` on every change.
  - **Soft deletes**: `deleteTask` and `deleteTag` now set `deletedAt` instead of removing records, preserving them for sync. Public query functions (`getAllTasks`, `getAllTags`) filter out soft-deleted records. `getAllTasksIncludingDeleted` / `getAllTagsIncludingDeleted` exposed for the sync layer.
  - **Supabase schema**: Created 5 tables with RLS (Row Level Security) — `tasks`, `tags`, `user_state`, `daily_records`, `integrity_events`. All tables scoped to `auth.uid()` via RLS policies. Indexed on `(user_id, updated_at)` for efficient delta sync queries.
  - **SyncService** (`src/services/syncService.ts`): Offline-first sync layer.
    - **Strategy**: Write locally first (AsyncStorage), then push to Supabase in background. On foreground/login, pull remote changes since last sync and merge using last-write-wins.
    - **Push**: Upserts all local tasks, tags, user_state, daily_records, and integrity_events to Supabase.
    - **Pull**: Fetches remote records updated since `lastSyncAt`, merges with local using timestamp comparison (last-write-wins). For `user_state`, uses max-value merge for critical fields (streak, integrity, boosts) to avoid penalizing the user.
    - **Concurrency guard**: `isSyncing` flag prevents overlapping sync operations.
    - **Storage key**: `LAST_SYNC_AT` tracks last successful sync timestamp.
  - **Sync triggers** (wired in `App.tsx` + screens):
    - On auth session change (login) — full sync.
    - On app foreground (AppState → active) — full sync.
    - After every mutation (task create/close/uncomplete/reschedule/delete, tag create/update/delete) — background sync via `syncInBackground()`.
  - **Screens updated with sync calls**: HomeScreen, ReviewDashboardScreen, ProfileScreen.
  - **SyncContext** (`src/context/SyncContext.tsx`): Centralized sync state provider. Tracks `lastSyncAt` timestamp so screens auto-reload after sync completes. Replaces inline sync logic in `App.tsx`. Exposes `triggerSync()` for pull-to-refresh. All data screens watch `lastSyncAt` in `useFocusEffect` deps.
  - **Full pull strategy**: Removed incremental `since` filter from `pullTasks`/`pullTags` — always pulls all user data. Eliminates missed-records bugs when devices sync at different times. Data volume is negligible for a personal task app.
- 2026-02-13 — Gesture System:
  - **Swipe left to delete** (`TaskCard`): Bidirectional swipe — right to complete (green bg, checkmark icon), left to delete (red bg, trash icon). Haptic feedback at threshold crossing. Works on all screens using TaskCard.
  - **Swipe down to dismiss** (`TaskDetailSheet`, `AddTaskSheet`): PanResponder on drag handle area. Sheet follows finger, dismisses at 120px or velocity > 0.5, otherwise springs back.
  - **Calendar swipe** (`ReviewDashboardScreen`): Horizontal swipe on calendar grid navigates months (left → next, right → previous). 50px threshold with 1.5x horizontal bias to avoid false triggers on scroll.
  - **Long press quick actions** (`HomeScreen`): `QuickActionSheet` component — animated scale-in context menu with Complete/Reopen, Reschedule Tomorrow, and Delete actions. Heavy haptic on trigger. 400ms delay.
  - **Swipeable dashboard rows** (`ReviewDashboardScreen`): `SwipeableRow` component replaces static `renderRow`. Swipe right to complete (action rows only), swipe left to delete (all rows). Green/red backgrounds with icons. Haptic feedback at threshold.
  - **Pull-to-refresh + sync**: All scrollable screens (Home, ReviewDashboard, Review) trigger `triggerSync()` on pull-to-refresh for manual cloud sync.
- 2026-02-15 — Usability Polish Pass:
  - **Skeleton loading states**: Added `Skeleton`, `TaskCardSkeleton`, `TaskListSkeleton` components in `ds/`. HomeScreen shows shimmer placeholders while data loads.
  - **Haptic feedback**: Accordion toggles (ReviewDashboard trends) now trigger light haptic on expand/collapse.
  - **Task sorting**: HomeScreen filter row includes sort toggle (Due date / Newest / Alphabetical). Overdue tasks always float to top regardless of sort mode.
  - **Overdue badge**: Review tab shows a red badge with count of overdue tasks in the custom tab bar.
  - **Two-stage swipe-to-delete**: Partial left swipe reveals a "Delete" confirm button (80px). Full fast swipe still triggers immediate delete.
  - **Animated tab transitions**: Tab screens use `animation: 'fade'` for smooth transitions.
  - **OfflineBanner redesign**: Larger notification-style card with icon box, two-line layout (title + subtitle), ActivityIndicator spinner during sync, color-coded states (primary/blue syncing, warning/amber offline, green synced), proper animate-in/animate-out with opacity + translateY.
  - **Toast notification redesign**: Larger, positioned at top of screen with icon containers and stronger shadows.
- 2026-02-15 — Task Search:
  - **HomeScreen search bar**: Inline search bar between stats and filter row. Filters tasks by title and description (case-insensitive). Clear button appears when query is active. Search integrates with existing tag filter and sort mode.
- 2026-02-15 — Task Notes / Description:
  - **Data model**: Added optional `description?: string` field to `Task` interface (max 500 chars).
  - **TaskService**: `createTask` now accepts `options.description`. New `updateTaskDescription` function for editing notes on existing tasks.
  - **AddTaskSheet**: Optional multiline "Add notes" input below the title field.
  - **TaskDetailSheet**: Editable multiline description field between subtitle and tags. Changes persist immediately via `onDescriptionChange` callback.
  - **TaskCard**: Single-line description preview below the task title.
  - **Sync**: `description` field added to push/pull mappings in syncService. Supabase `tasks` table has `description text` column.
- 2026-02-15 — Recurring Tasks:
  - **Data model**: Added `RecurrenceType = 'daily' | 'weekly' | 'monthly' | null` type. Added `recurrence?: RecurrenceType` and `recurrenceSourceId?: string` fields to `Task` interface.
  - **Auto-spawn on completion**: When a recurring task is closed, `closeTask` automatically creates the next occurrence with the appropriate due date (daily: +1 day, weekly: +7 days, monthly: +1 month). The new task inherits title, description, tags, and recurrence settings. `recurrenceSourceId` links back to the original task.
  - **AddTaskSheet**: "REPEAT" section with None / Daily / Weekly / Monthly chip selector. Recurrence is passed through `onSubmit` options.
  - **TaskDetailSheet**: Recurrence indicator pill ("Repeats daily/weekly/monthly") shown below the subtitle for recurring tasks.
  - **TaskCard**: Recurrence badge with repeat icon shown in the meta row alongside tags.
  - **Sync**: `recurrence` and `recurrence_source_id` fields added to push/pull mappings. Supabase `tasks` table has `recurrence text` and `recurrence_source_id uuid` columns.
- 2026-02-15 — Unified Task Modal:
  - **Replaced** `AddTaskSheet` (bottom sheet) and `TaskDetailSheet` (bottom sheet) with a single **`TaskModal`** full-screen modal component (`src/components/TaskModal.tsx`).
  - **Three modes**: `add` (new task creation), `view` (read-only task details), `edit` (modify all fields).
  - **Add mode**: Title input, description textarea, due date preset chips (Today/Tomorrow/This week), recurrence selector (None/Daily/Weekly/Monthly), tag picker with inline create.
  - **View mode**: Read-only display of all task fields (title, notes, due date, repeat, tags, created date). Status chip (Open/Overdue/Completed). Complete/Mark as Open action button. Edit button in header transitions to edit mode. Delete with confirmation.
  - **Edit mode**: All fields editable — title, description, due date (inline calendar reschedule), recurrence (chip selector), tags (toggle + create). Save button in header. Delete at bottom.
  - **Recurrence editing**: Users can now change or remove repeat settings on existing tasks via edit mode. New `updateTaskRecurrence` function in `taskService.ts`.
  - **Screens updated**: HomeScreen, ReviewDashboardScreen, ReviewScreen all now use `TaskModal` instead of the old bottom sheets.
  - **UX improvements**: Full-screen modal gives more room for content, no keyboard conflicts, clean header with contextual actions (Close / Edit / Save / Add).