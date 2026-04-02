// Ravyn — Supabase Client
// Initializes the Supabase client with AsyncStorage for session persistence
// Auto-refreshes tokens when app is in foreground

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!supabaseUrl || !supabaseAnonKey)) {
    console.error(
        '[Supabase] Missing env vars. Copy .env.example to .env and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
    },
});

// Auto-refresh session when app comes to foreground
AppState.addEventListener('change', (state) => {
    try {
        if (state === 'active') {
            supabase.auth.startAutoRefresh();
        } else {
            supabase.auth.stopAutoRefresh();
        }
    } catch (e) {
        console.warn('[Supabase] Auto-refresh error (offline?):', e);
    }
});
