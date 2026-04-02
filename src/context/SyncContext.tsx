// Ravyn — Sync Context
// Provides sync state to the app. Screens watch `lastSyncAt` to reload after sync.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { sync } from '../services/syncService';

interface SyncData {
    lastSyncAt: number;
    isSyncing: boolean;
    isOnline: boolean;
    triggerSync: () => void;
}

const SyncContext = createContext<SyncData>({
    lastSyncAt: 0,
    isSyncing: false,
    isOnline: true,
    triggerSync: () => { },
});

export function useSync() {
    return useContext(SyncContext);
}

interface SyncProviderProps extends PropsWithChildren {
    session: Session | null;
}

export function SyncProvider({ session, children }: SyncProviderProps) {
    const [lastSyncAt, setLastSyncAt] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isOnline, setIsOnline] = useState(true);
    const appStateRef = useRef(AppState.currentState);

    // Track connectivity via navigator.onLine (web) or periodic check
    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const onOnline = () => setIsOnline(true);
            const onOffline = () => setIsOnline(false);
            setIsOnline(navigator.onLine);
            window.addEventListener('online', onOnline);
            window.addEventListener('offline', onOffline);
            return () => {
                window.removeEventListener('online', onOnline);
                window.removeEventListener('offline', onOffline);
            };
        }
    }, []);

    const runSync = useCallback(async () => {
        if (isSyncing || !session) return;
        setIsSyncing(true);
        try {
            await sync();
            setLastSyncAt(Date.now());
            setIsOnline(true);
        } catch (e) {
            console.error('[SyncContext] Sync failed:', e);
            setIsOnline(false);
        } finally {
            setIsSyncing(false);
        }
    }, [session, isSyncing]);

    // Sync on login / session change
    useEffect(() => {
        if (session) {
            runSync();
        }
    }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync on app foreground
    useEffect(() => {
        const sub = AppState.addEventListener('change', (nextState) => {
            if (appStateRef.current.match(/inactive|background/) && nextState === 'active' && session) {
                runSync();
            }
            appStateRef.current = nextState;
        });
        return () => sub.remove();
    }, [session, runSync]);

    return (
        <SyncContext.Provider value={{ lastSyncAt, isSyncing, isOnline, triggerSync: runSync }}>
            {children}
        </SyncContext.Provider>
    );
}
