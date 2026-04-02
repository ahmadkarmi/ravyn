// Ravyn — App Entry Point
// Flow: Loading → Onboarding → Login → Main App
// Wraps in ThemeProvider + ToastProvider + AuthProvider

import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import AppNavigator from './src/navigation/AppNavigator';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { getUserState } from './src/services/integrityService';
import { supabase } from './src/lib/supabase';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from './src/components/ErrorBoundary';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enableLogs: true,
});

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'ravyn://'],
  config: {
    screens: {
      Today: 'today',
      Review: 'review',
      Profile: 'profile',
    },
  },
};

function AppInner() {
  const { colors, isDark } = useTheme();
  const { session, isLoading: authLoading } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  // Handle deep links for Supabase auth (password reset, OAuth callback)
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url) return;
      // Supabase embeds tokens in the URL fragment (#access_token=...&refresh_token=...)
      const hashIndex = url.indexOf('#');
      if (hashIndex === -1) return;

      const fragment = url.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        try {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          console.log('[DeepLink] Session restored from auth callback');
        } catch (e) {
          console.warn('[DeepLink] Failed to set session:', e);
        }
      }
    };

    // Handle URL that opened the app
    Linking.getInitialURL().then((url) => { if (url) handleDeepLink(url); });

    // Handle URLs while app is open
    const sub = Linking.addEventListener('url', (event) => handleDeepLink(event.url));
    return () => sub.remove();
  }, []);

  const checkOnboarding = useCallback(async () => {
    try {
      const state = await getUserState();
      setOnboarded(state.onboardingComplete);
    } catch (e) {
      console.error('Onboarding check failed:', e);
    } finally {
      setAppLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  const loading = appLoading || authLoading;

  // ─── Loading ──────────────────────────────

  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={[styles.center, { backgroundColor: colors.background }]}> 
          <View style={[styles.loadingBackdropLayer, { pointerEvents: 'none' }]}>
            <View style={[styles.loadingOrbTop, { backgroundColor: colors.primaryMuted }]} />
            <View style={[styles.loadingOrbBottom, { backgroundColor: colors.accentMuted }]} />
          </View>
          <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={[styles.loadingDot, { backgroundColor: colors.primary }]} />
            <View style={styles.loadingTitleRow}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          </View>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      </SafeAreaProvider>
    );
  }

  // ─── Onboarding & Main App ────────────────

  return (
    <SafeAreaProvider>
      {!onboarded ? (
        <View style={[styles.flex, { backgroundColor: colors.background }]}>
          <OnboardingScreen onComplete={() => setOnboarded(true)} />
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </View>
      ) : (
        <NavigationContainer
          linking={linking}
          theme={{
            dark: isDark,
            colors: {
              primary: colors.primary,
              background: colors.background,
              card: colors.surface,
              text: colors.textPrimary,
              border: colors.border,
              notification: colors.danger,
            },
            fonts: {
              regular: { fontFamily: 'System', fontWeight: '400' },
              medium: { fontFamily: 'System', fontWeight: '500' },
              bold: { fontFamily: 'System', fontWeight: '700' },
              heavy: { fontFamily: 'System', fontWeight: '800' },
            },
          }}
        >
          <SyncProvider session={session}>
            {/* Always show main app for onboarded users; sign-in is opt-in from Profile */}
            <AppNavigator onReset={() => setOnboarded(false)} />
          </SyncProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppInner />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  loadingOrbTop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 999,
    top: -120,
    right: -80,
    opacity: 0.45,
  },
  loadingOrbBottom: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    bottom: -90,
    left: -70,
    opacity: 0.32,
  },
  loadingCard: {
    minWidth: 180,
    minHeight: 84,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginBottom: 10,
  },
  loadingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});