// Ravyn — Design System
// Apple Books-inspired, dual-palette, WCAG AA compliant

import { Platform } from 'react-native';

// ─── Color Palettes ───────────────────────────────────

export interface ColorPalette {
    // Backgrounds
    background: string;
    surface: string;
    surfaceElevated: string;
    surfacePressed: string;

    // Text — all meet WCAG AA contrast ratios
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;

    // Primary accent — burnt sienna / warm coral
    primary: string;
    primaryDepth: string; // Darker shade for 3D edge
    primaryMuted: string;
    primaryContrast: string; // text on primary bg

    // Secondary accent — deep gold
    accent: string;
    accentDepth: string;
    accentMuted: string;

    // Semantic
    success: string;
    successDepth: string;
    successMuted: string;
    danger: string;
    error: string;
    dangerDepth: string;
    dangerMuted: string;
    warning: string;
    warningDepth: string;
    warningMuted: string;
    info: string;
    infoDepth: string;
    infoMuted: string;

    // Streak flame
    streak: string;
    streakGlow: string;

    // Integrity
    integrity: string;
    integrityMuted: string;

    // Boost
    boost: string;
    boostMuted: string;

    // Borders & dividers
    border: string;
    divider: string;
    separator: string;

    // Overlays
    overlay: string;
    overlayLight: string;

    // Tab bar
    tabBar: string;
    tabBarBorder: string;

    // Input
    inputBackground: string;
    inputBorder: string;
    placeholder: string;

    // Card
    card: string;
    cardDepth: string; // Darker edge for card
    cardBorder: string;
}

export const lightColors: ColorPalette = {
    // Backgrounds — warm cream (Apple Books)
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F5F2ED',
    surfacePressed: '#EDE9E3',

    // Text — high contrast on cream
    textPrimary: '#1C1917',     // 14.5:1 on cream
    textSecondary: '#57534E',   // 7.2:1 on cream
    textMuted: '#A8A29E',       // 3.1:1 (decorative only)
    textInverse: '#FAFAF9',

    // Primary — rich burnt sienna
    primary: '#B94A2F',
    primaryDepth: '#8A3622',    // Darker for depth
    primaryMuted: '#F3DDD6',
    primaryContrast: '#FFFFFF',

    // Accent — deep antique gold
    accent: '#92700C',
    accentDepth: '#6B5209',
    accentMuted: '#F5EDD4',

    // Semantic
    success: '#2D7D46',
    successDepth: '#1E522E',
    successMuted: '#E3F5E8',
    danger: '#C53030',
    error: '#C53030',
    dangerDepth: '#8E2222',
    dangerMuted: '#FDE8E8',
    warning: '#9F6B00',
    warningDepth: '#734D00',
    warningMuted: '#FEF3CD',
    info: '#2563EB',
    infoDepth: '#18429B',
    infoMuted: '#DBEAFE',

    // Streak
    streak: '#D4490A',
    streakGlow: '#FDEBD3',

    // Integrity
    integrity: '#2563EB',
    integrityMuted: '#DBEAFE',

    // Boost
    boost: '#7C3AED',
    boostMuted: '#EDE9FE',

    // Borders
    border: '#E2DDD7',
    divider: '#EDE9E3',
    separator: '#D6D0C8',

    // Overlays
    overlay: 'rgba(28, 25, 23, 0.5)',
    overlayLight: 'rgba(28, 25, 23, 0.08)',

    // Tab bar
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2DDD7',

    // Input
    inputBackground: '#FFFFFF',
    inputBorder: '#D6D0C8',
    placeholder: '#A8A29E',

    // Card
    card: '#FFFFFF',
    cardDepth: '#E5E5E5', // Light gray depth for white card
    cardBorder: '#E2DDD7',
};

export const darkColors: ColorPalette = {
    // Backgrounds — refined dark
    background: '#0F0F0F',
    surface: '#1A1A1C',
    surfaceElevated: '#252527',
    surfacePressed: '#303032',

    // Text — high contrast on dark
    textPrimary: '#F5F5F7',     // 18.6:1 on #0F0F0F
    textSecondary: '#A1A1A6',   // 7.3:1 on dark
    textMuted: '#636366',       // 3.7:1 (decorative)
    textInverse: '#1C1917',

    // Primary — warm coral
    // Primary — refined burnt sienna
    primary: '#FF6B4A',
    primaryDepth: '#B94A2F',
    primaryMuted: '#3A1D16',
    primaryContrast: '#000000',

    // Accent — gold
    accent: '#FFD700',
    accentDepth: '#C6A700',
    accentMuted: '#3A3216',

    // Semantic
    success: '#34C759',
    successDepth: '#248A3D',
    successMuted: '#102916',
    danger: '#FF453A',
    error: '#FF453A',
    dangerDepth: '#B32E26',
    dangerMuted: '#2C1515',
    warning: '#FFD60A',
    warningDepth: '#B2970E',
    warningMuted: '#2C2510',
    info: '#0A84FF',
    infoDepth: '#0657A8',
    infoMuted: '#102035',

    // Streak
    streak: '#FF5E1E',
    streakGlow: '#3A1D16',

    // Integrity
    integrity: '#0A84FF',
    integrityMuted: '#102035',

    // Boost
    boost: '#BF5AF2',
    boostMuted: '#2D1636',

    // Borders
    border: '#2C2C2E',
    divider: '#3A3A3C',
    separator: '#3A3A3C',

    // Overlays
    overlay: 'rgba(0, 0, 0, 0.65)',
    overlayLight: 'rgba(255, 255, 255, 0.1)',

    // Tab bar
    tabBar: '#1A1A1C',
    tabBarBorder: 'rgba(255, 255, 255, 0.1)',

    // Input
    inputBackground: '#2C2C2E',
    inputBorder: '#3A3A3C',
    placeholder: '#636366',

    // Card
    card: '#242426',
    cardDepth: '#0F0F0F',
    cardBorder: '#3A3A3C',
};

// ─── Spacing ──────────────────────────────────────────

export const spacing = {
    '2xs': 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
} as const;

// ─── Border Radius ────────────────────────────────────

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
} as const;

// ─── Typography ───────────────────────────────────────
// Serif headings (Apple Books-inspired) + sans-serif body

export const fonts = {
    serif: 'Georgia',         // Elegant serif for headings
    sans: 'System',           // System font for body
} as const;

export const typography = {
    displayLarge: {
        fontFamily: fonts.serif,
        fontSize: 44,
        fontWeight: '700' as const,
        letterSpacing: -0.5,
        lineHeight: 52,
    },
    displayMedium: {
        fontFamily: fonts.serif,
        fontSize: 34,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
        lineHeight: 41,
    },
    headlineLarge: {
        fontFamily: fonts.sans,
        fontSize: 26,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
        lineHeight: 32,
    },
    headlineMedium: {
        fontFamily: fonts.sans,
        fontSize: 22,
        fontWeight: '600' as const,
        letterSpacing: -0.2,
        lineHeight: 28,
    },
    headlineSmall: {
        fontFamily: fonts.sans,
        fontSize: 17,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    bodyLarge: {
        fontFamily: fonts.sans,
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 25,
    },
    bodyMedium: {
        fontFamily: fonts.sans,
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 22,
    },
    bodySmall: {
        fontFamily: fonts.sans,
        fontSize: 13,
        fontWeight: '400' as const,
        lineHeight: 18,
    },
    label: {
        fontFamily: fonts.sans,
        fontSize: 11,
        fontWeight: '600' as const,
        letterSpacing: 0.6,
        textTransform: 'uppercase' as const,
    },
    caption: {
        fontFamily: fonts.sans,
        fontSize: 12,
        fontWeight: '500' as const,
        lineHeight: 16,
    },

    // Backward-compatible aliases (legacy screens still reference these)
    h1: {
        fontFamily: fonts.serif,
        fontSize: 34,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
        lineHeight: 41,
    },
    h2: {
        fontFamily: fonts.serif,
        fontSize: 26,
        fontWeight: '700' as const,
        letterSpacing: 0,
        lineHeight: 32,
    },
    h3: {
        fontFamily: fonts.sans,
        fontSize: 17,
        fontWeight: '600' as const,
        lineHeight: 22,
    },
    body: {
        fontFamily: fonts.sans,
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 25,
    },
} as const;

// ─── Shadows ──────────────────────────────────────────

const isWeb = Platform.OS === 'web';

export const shadows = {
    sm: isWeb
        ? { boxShadow: '0px 1px 3px rgba(0,0,0,0.06)' }
        : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 3,
              elevation: 2,
          },
    md: isWeb
        ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.08)' }
        : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 4,
          },
    lg: isWeb
        ? { boxShadow: '0px 4px 16px rgba(0,0,0,0.12)' }
        : {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 8,
          },
    // Warm-tinted card shadow — uses primary burnt sienna hue for depth that
    // feels on-palette instead of neutral grey.
    warm: isWeb
        ? { boxShadow: '0px 2px 10px rgba(185,74,47,0.10)' }
        : {
              shadowColor: '#B94A2F',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.10,
              shadowRadius: 10,
              elevation: 4,
          },
    glow: (color: string) =>
        isWeb
            ? { boxShadow: `0px 0px 14px 0px ${color}59` }
            : {
                  shadowColor: color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 14,
                  elevation: 6,
              },
};

// ─── Animation Configs ────────────────────────────────

export const animations = {
    spring: {
        damping: 18,
        stiffness: 200,
        mass: 0.8,
    },
    springGentle: {
        damping: 22,
        stiffness: 140,
        mass: 1,
    },
    timing: {
        fast: 150,
        normal: 250,
        slow: 400,
    },
} as const;
