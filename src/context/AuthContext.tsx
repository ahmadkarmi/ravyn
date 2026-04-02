// Ravyn — Auth Context
// Provides session state and auth helpers to the entire app

import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase';
import { clearAll } from '../services/storageService';

interface AuthData {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthData>({
    session: null,
    user: null,
    isLoading: true,
    signOut: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: PropsWithChildren) {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Fetch initial session
        supabase.auth.getSession()
            .then(({ data: { session } }) => {
                setSession(session);
            })
            .catch((e) => {
                console.warn('[Auth] getSession failed (offline?):', e.message);
            })
            .finally(() => {
                setIsLoading(false);
            });

        // Subscribe to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                if (session?.user) {
                    Sentry.setUser({ id: session.user.id });
                } else {
                    Sentry.setUser(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        setSession(null); // Instant UI update
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('SignOut error (ignoring):', e);
        }
        // Clear all local data to prevent leaking between accounts on shared devices
        try {
            await clearAll();
        } catch (e) {
            console.warn('[Auth] Failed to clear local data on sign out:', e);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                isLoading,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
