import { spacing, borderRadius, shadows } from '../../theme';

// ─── Semantic Layout Tokens ──────────────────────────
// Built on top of the base spacing scale from theme.
// Use these in screens and DS components for consistent spatial rhythm.

export const layout = {
    // ── Screen-level
    screenPaddingX: spacing.lg,       // 16 — horizontal padding for all screens
    screenTopGap: spacing.xl,         // 24 — gap below safe-area inset
    screenBottomPad: 120,             // clearance above tab bar

    // ── Card
    cardPadding: 20,                  // internal padding (between lg:16 and xl:24)
    cardRadius: borderRadius.xl,      // 20
    cardShadow: shadows.warm,
    cardGap: spacing.md,              // 12 — vertical gap between stacked cards

    // ── Section
    sectionGap: spacing.lg,           // 16 — gap between major sections
    sectionHeaderGap: spacing.sm,     // 8  — gap between icon/label/badge in headers

    // ── Chip row
    chipGap: spacing.sm,              // 8  — gap between chips in a row

    // ── Sheet
    sheetRadius: borderRadius.xl,     // 20
    sheetHandleWidth: 36,
    sheetHandleHeight: 4,

    // ── FAB
    fabSize: 54,
    fabRadius: 27,
    fabRight: spacing.xl,             // 24

    // ── Avatar
    avatarSm: 38,
    avatarMd: 56,
    avatarLg: 76,

    // ── IconBox
    iconBoxSm: 28,                    // card title icons
    iconBoxMd: 34,                    // menu item icons
    iconBoxLg: 40,                    // hero icons

    // ── Divider / micro
    hairline: 1,                      // StyleSheet.hairlineWidth equivalent
    microGap: spacing['2xs'],         // 2  — tiny optical adjustments
} as const;
