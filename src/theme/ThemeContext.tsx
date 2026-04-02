// Ravyn — Theme Context (Dark / Light / Auto)

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, type ColorPalette } from './index';

// ─── Types ────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    resolved: ResolvedTheme;
    colors: ColorPalette;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
}

const STORAGE_KEY = '@ravyn/themeMode';

// ─── Context ──────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType>({
    mode: 'auto',
    resolved: 'light',
    colors: lightColors,
    isDark: false,
    setThemeMode: () => { },
});

// ─── Provider ─────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemScheme = useColorScheme();
    const [mode, setMode] = useState<ThemeMode>('auto');
    const [loaded, setLoaded] = useState(false);

    // Load persisted theme on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored === 'light' || stored === 'dark' || stored === 'auto') {
                    setMode(stored);
                }
            } catch {
                // Fallback to auto
            } finally {
                setLoaded(true);
            }
        })();
    }, []);

    const setThemeMode = useCallback(async (newMode: ThemeMode) => {
        setMode(newMode);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, newMode);
        } catch {
            // Silently fail
        }
    }, []);

    const resolved: ResolvedTheme = useMemo(() => {
        if (mode === 'auto') {
            return systemScheme === 'dark' ? 'dark' : 'light';
        }
        return mode;
    }, [mode, systemScheme]);

    const colors = useMemo(
        () => (resolved === 'dark' ? darkColors : lightColors),
        [resolved],
    );

    const value = useMemo<ThemeContextType>(
        () => ({
            mode,
            resolved,
            colors,
            isDark: resolved === 'dark',
            setThemeMode,
        }),
        [mode, resolved, colors, setThemeMode],
    );

    if (!loaded) return null; // Prevent flash of wrong theme

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}
