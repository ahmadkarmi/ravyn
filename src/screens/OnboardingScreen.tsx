// Ravyn — Onboarding Screen V5
// 6 steps: Welcome → Philosophy → System → Notifications → Time → Account
// Skip button available on middle steps to jump straight to sign up

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Animated,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    LayoutAnimation,
    ActivityIndicator,
    Alert,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { getUserState, saveUserState } from '../services/integrityService';
import {
    GoogleIcon, AppleIcon, XIcon, FacebookIcon,
    MailIcon, LockIcon, EyeIcon, EyeOffIcon
} from '../components/SocialIcons';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from '../components/KeyboardToolbar';

// Required for OAuth redirect to complete
WebBrowser.maybeCompleteAuthSession();
import { requestPermissions, scheduleDailyNotifications } from '../services/notificationService';
import { supabase } from '../lib/supabase';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
    onComplete: () => void;
}

const STEPS = [
    {
        id: 'welcome',
        super: 'Close what matters',
        title: 'ravyn',
        body: 'Close at least one thing every day.\nBuild steady momentum.',
        isWelcome: true,
    },
    {
        id: 'intro',
        super: 'The Philosophy',
        title: 'Chaos is the\ndefault state.',
        body: 'Ravyn is not a planner. It is a closer.\n\nMost apps collect tasks.\nRavyn helps you finish at least the one that matters the most.',
    },
    {
        id: 'system',
        super: 'The System',
        title: 'Integrity is\nyour currency.',
        body: 'Every task you close earns Integrity Points.\n\nReach 200 points to earn a Boost Token.\nSpend a Boost on a missed day\nto keep your streak alive.',
    },
    {
        id: 'notify',
        super: 'Staying Honest',
        title: 'We nudge.\nNot nag.',
        body: 'One reminder before your deadline.\nOne check-in if you miss the day.\n\nThat\'s it. No spam. Ever.',
        isPermission: true,
    },
    {
        id: 'time',
        super: 'The Parameters',
        title: 'Define your\nwindow.',
        body: 'We use these times to support your rhythm.\n\nNotifications fire before your end time\nso you can close with less stress.',
    },
    {
        id: 'account',
        super: 'Your Account',
        title: 'Secure your\nprogress.',
        body: 'Sign in to sync your data across devices\nand never lose your streak.',
        isAuth: true,
    },
];

// Social providers for inline auth — brand-compliant colors
// Only showing providers that are enabled in Supabase dashboard
const SOCIAL_PROVIDERS = [
    { id: 'google' as const, label: 'Continue with Google', color: '#FFFFFF', textColor: '#3C4043', bordered: true, IconComponent: GoogleIcon },
    // { id: 'apple' as const, label: 'Continue with Apple', color: '#000000', textColor: '#FFFFFF', bordered: false, IconComponent: AppleIcon },
    // { id: 'twitter' as const, label: 'Continue with X', color: '#000000', textColor: '#FFFFFF', bordered: false, IconComponent: XIcon },
    // { id: 'facebook' as const, label: 'Continue with Facebook', color: '#1877F2', textColor: '#FFFFFF', bordered: false, IconComponent: FacebookIcon },
];

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
    const { colors, isDark } = useTheme();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [notifGranted, setNotifGranted] = useState<boolean | null>(null);

    // Form State
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('22:00');

    // Auth State
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authShowPassword, setAuthShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);

    const authPasswordRef = useRef<TextInput>(null);
    const endTimeRef = useRef<TextInput>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // ─── Transitions ─────────────────────────────────────

    const changeStep = (next: number) => {
        Haptics.selectionAsync();

        const useNative = Platform.OS !== 'web';
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: useNative }),
            Animated.timing(slideAnim, { toValue: -20, duration: 200, useNativeDriver: useNative }),
        ]).start(() => {
            setStep(next);
            slideAnim.setValue(20);
            const useNative = Platform.OS !== 'web';
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: useNative }),
                Animated.spring(slideAnim, { toValue: 0, damping: 20, stiffness: 100, useNativeDriver: useNative }),
            ]).start();
        });

        Animated.timing(progressAnim, {
            toValue: next / (STEPS.length - 1),
            duration: 400,
            useNativeDriver: false,
        }).start();
    };

    // ─── Logic ───────────────────────────────────────────

    const handleNotifPermission = async () => {
        Haptics.selectionAsync();
        const granted = await requestPermissions();
        setNotifGranted(granted);
        if (granted) await scheduleDailyNotifications();
        // Automatically advance to next step after brief delay
        setTimeout(() => changeStep(step + 1), 600);
    };

    // ─── Auth Logic ───

    const validateAuth = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!authEmail.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(authEmail)) {
            setEmailError('Please enter a valid email');
            valid = false;
        }

        if (!authPassword) {
            setPasswordError('Password is required');
            valid = false;
        } else if (authMode === 'signup' && authPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            valid = false;
        }

        return valid;
    };

    const handleEmailAuth = async () => {
        if (!validateAuth()) return;

        setAuthLoading(true);
        try {
            if (authMode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email: authEmail.trim(),
                    password: authPassword.trim(),
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: authEmail.trim(),
                    password: authPassword.trim(),
                });
                if (error) throw error;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleFinish();
        } catch (err: any) {
            Alert.alert('Auth Error', err.message ?? 'Something went wrong.');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSocialAuth = async (provider: typeof SOCIAL_PROVIDERS[number]) => {
        setSocialLoading(provider.id);
        try {
            if (Platform.OS === 'web') {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: provider.id,
                    options: {
                        redirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                return;
            }

            const redirectUrl = 'ravyn://auth-callback';
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider.id,
                options: {
                    skipBrowserRedirect: true,
                    redirectTo: redirectUrl,
                },
            });
            if (error) throw error;
            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(
                    data.url,
                    redirectUrl,
                    { showInRecents: true }
                );
                if (result.type === 'success' && result.url) {
                    const url = new URL(result.url);
                    const params = new URLSearchParams(url.hash.substring(1));
                    const accessToken = params.get('access_token');
                    const refreshToken = params.get('refresh_token');
                    if (accessToken && refreshToken) {
                        await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken,
                        });
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        handleFinish();
                    }
                }
            }
        } catch (err: any) {
            const msg = err.message ?? '';
            if (msg.includes('not enabled') || msg.includes('validation_failed') || msg.includes('400')) {
                Alert.alert(
                    'Provider Not Available',
                    `${provider.label.replace('Continue with ', '')} sign-in hasn't been configured yet. Please use email/password for now.`
                );
            } else {
                Alert.alert('Social Sign In', msg || 'Could not complete sign in.');
            }
        } finally {
            setSocialLoading(null);
        }
    };

    const handleFinish = async () => {
        if (loading) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLoading(true);

        try {
            const state = await getUserState();
            state.startOfDay = startTime;
            state.endOfDay = endTime;
            state.onboardingComplete = true;
            await saveUserState(state);

            // Notifications already requested in the permission step
            // If they weren't granted there, try one more time silently
            if (!notifGranted) {
                const granted = await requestPermissions();
                if (granted) await scheduleDailyNotifications();
            }
        } catch (e) {
            console.warn('Setup error:', e);
        } finally {
            onComplete();
        }
    };

    // ─── Renderers ───────────────────────────────────────

    const renderContent = () => {
        const currentStep = STEPS[step];
        const isTime = currentStep.id === 'time';
        const isAuth = (currentStep as any).isAuth;
        const isPermission = (currentStep as any).isPermission;
        const isWelcome = (currentStep as any).isWelcome;

        return (
            <View style={styles.textContainer}>
                {/* Welcome step: 3-level hierarchy — eyebrow / logo / body */}
                {isWelcome ? (
                    <View style={styles.welcomeWrap}>
                        <Text style={[styles.superTitle, { color: colors.primary, textAlign: 'center' }]}>
                            {currentStep.super.toUpperCase()}
                        </Text>
                        <Text style={[styles.welcomeLogo, { color: colors.primary }]}>
                            ravyn
                        </Text>
                        <View style={[styles.welcomeDivider, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.bodyText, { color: colors.textSecondary, textAlign: 'center' }]}>
                            {currentStep.body}
                        </Text>
                    </View>
                ) : (
                    <>
                        {currentStep.super ? (
                            <Text style={[styles.superTitle, { color: colors.primary }]}>
                                {currentStep.super.toUpperCase()}
                            </Text>
                        ) : null}
                        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
                            {currentStep.title}
                        </Text>
                        <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
                            {currentStep.body}
                        </Text>
                    </>
                )}

                {/* Time inputs */}
                {isTime && (
                    <View style={styles.inputsRow}>
                        <View style={styles.timeBlock}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>START</Text>
                            <TextInput
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                style={[styles.timeInput, { color: colors.textPrimary, borderColor: colors.primary }]}
                                value={startTime}
                                onChangeText={setStartTime}
                                placeholder="09:00"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                returnKeyType="next"
                                blurOnSubmit={false}
                                onSubmitEditing={() => endTimeRef.current?.focus()}
                                autoFocus
                            />
                        </View>
                        <View style={styles.timeBlock}>
                            <Text style={[styles.label, { color: colors.textMuted }]}>END</Text>
                            <TextInput
                                ref={endTimeRef}
                                inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                style={[styles.timeInput, { color: colors.textPrimary, borderColor: colors.primary }]}
                                value={endTime}
                                onChangeText={setEndTime}
                                placeholder="18:00"
                                placeholderTextColor={colors.placeholder}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                                returnKeyType="done"
                            />
                        </View>
                    </View>
                )}

                {/* Permission step */}
                {isPermission && (
                    <View style={styles.permissionBlock}>
                        {notifGranted === null && (
                            <TouchableOpacity
                                style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                                onPress={handleNotifPermission}
                                activeOpacity={0.9}
                            >
                                <Text style={[styles.permissionBtnText, { color: colors.primaryContrast }]}>
                                    🔔  ALLOW NOTIFICATIONS
                                </Text>
                            </TouchableOpacity>
                        )}
                        {notifGranted === true && (
                            <Text style={[styles.permissionStatus, { color: colors.success }]}>
                                Notifications on. We'll keep it minimal.
                            </Text>
                        )}
                        {notifGranted === false && (
                            <Text style={[styles.permissionStatus, { color: colors.textMuted }]}>
                                No worries. You can turn them on later in Settings.
                            </Text>
                        )}
                    </View>
                )}

                {/* ─── Auth Step ─── */}
                {isAuth && (
                    <View style={styles.authBlock}>
                        {/* Email form */}
                        {/* Email form */}
                        <View style={styles.authInputGroup}>
                            <View style={[
                                styles.authInputContainer,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: emailError ? colors.error : (authEmail ? colors.primary : colors.inputBorder),
                                }
                            ]}>
                                <View style={styles.authInputIconLeft}>
                                    <MailIcon color={colors.placeholder} size={20} />
                                </View>
                                <TextInput
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    style={[styles.authInputField, { color: colors.textPrimary }]}
                                    placeholder="you@example.com"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => authPasswordRef.current?.focus()}
                                    value={authEmail}
                                    onChangeText={(t) => { setAuthEmail(t); setEmailError(''); }}
                                    editable={!authLoading}
                                />
                            </View>
                            {emailError ? <Text style={[styles.authErrorText, { color: colors.error }]}>{emailError}</Text> : null}
                        </View>

                        <View style={styles.authInputGroup}>
                            <View style={[
                                styles.authInputContainer,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: passwordError ? colors.error : (authPassword ? colors.primary : colors.inputBorder),
                                }
                            ]}>
                                <View style={styles.authInputIconLeft}>
                                    <LockIcon color={colors.placeholder} size={20} />
                                </View>
                                <TextInput
                                    ref={authPasswordRef}
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    style={[styles.authInputField, { color: colors.textPrimary }]}
                                    placeholder={authMode === 'signup' ? 'Create a password' : 'Your password'}
                                    placeholderTextColor={colors.placeholder}
                                    secureTextEntry={!authShowPassword}
                                    textContentType={authMode === 'signup' ? 'newPassword' : 'password'}
                                    returnKeyType="done"
                                    onSubmitEditing={handleEmailAuth}
                                    value={authPassword}
                                    onChangeText={(t) => { setAuthPassword(t); setPasswordError(''); }}
                                    editable={!authLoading}
                                />
                                <TouchableOpacity
                                    style={styles.authInputIconRight}
                                    onPress={() => setAuthShowPassword(!authShowPassword)}
                                    accessibilityRole="button"
                                    accessibilityLabel={authShowPassword ? 'Hide password' : 'Show password'}
                                >
                                    {authShowPassword ?
                                        <EyeOffIcon color={colors.placeholder} size={20} /> :
                                        <EyeIcon color={colors.placeholder} size={20} />
                                    }
                                </TouchableOpacity>
                            </View>
                            {passwordError ? <Text style={[styles.authErrorText, { color: colors.error }]}>{passwordError}</Text> : null}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.authSubmitBtn,
                                { backgroundColor: colors.primary },
                                authLoading && { opacity: 0.7 },
                            ]}
                            activeOpacity={0.85}
                            onPress={handleEmailAuth}
                            disabled={authLoading}
                        >
                            {authLoading ? (
                                <ActivityIndicator color={colors.primaryContrast} />
                            ) : (
                                <Text style={[styles.authSubmitText, { color: colors.primaryContrast }]}>
                                    {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setAuthMode(authMode === 'signup' ? 'signin' : 'signup')}
                            disabled={authLoading}
                            style={styles.authToggle}
                        >
                            <Text style={[styles.authToggleText, { color: colors.textSecondary }]}>
                                {authMode === 'signup'
                                    ? 'Already have an account? '
                                    : "Don't have an account? "}
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                    {authMode === 'signup' ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </Text>
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.authDivider}>
                            <View style={[styles.authDividerLine, { backgroundColor: colors.divider }]} />
                            <Text style={[styles.authDividerText, { color: colors.textMuted }]}>or</Text>
                            <View style={[styles.authDividerLine, { backgroundColor: colors.divider }]} />
                        </View>

                        {/* Social buttons — full width per brand guidelines */}
                        <View style={styles.authSocialBlock}>
                            {SOCIAL_PROVIDERS.map((p) => {
                                const Icon = p.IconComponent;
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[
                                            styles.authSocialBtn,
                                            {
                                                backgroundColor: p.color,
                                                borderColor: p.bordered ? colors.border : 'transparent',
                                                borderWidth: p.bordered ? 1 : 0,
                                            },
                                            socialLoading === p.id && { opacity: 0.7 },
                                        ]}
                                        activeOpacity={0.85}
                                        onPress={() => handleSocialAuth(p)}
                                        disabled={authLoading || socialLoading !== null}
                                    >
                                        {socialLoading === p.id ? (
                                            <ActivityIndicator color={p.textColor} size="small" />
                                        ) : (
                                            <>
                                                <View style={styles.authSocialIconWrap}>
                                                    <Icon size={20} color={p.id === 'google' ? undefined : p.textColor} />
                                                </View>
                                                <Text style={[styles.authSocialLabel, { color: p.textColor }]}>
                                                    {p.label}
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Continue without account */}
                        <TouchableOpacity
                            style={styles.skipAccountBtn}
                            onPress={handleFinish}
                            disabled={loading || authLoading}
                            accessibilityRole="button"
                            accessibilityLabel="Continue without an account"
                        >
                            <Text style={[styles.skipAccountText, { color: colors.textMuted }]}>
                                Continue without an account
                            </Text>
                        </TouchableOpacity>

                        {/* GDPR consent notice */}
                        <Text style={[styles.consentText, { color: colors.textMuted }]}>
                            By creating an account, you agree to our{' '}
                            <Text
                                style={{ color: colors.primary }}
                                onPress={() => Linking.openURL('https://ravyn.app/privacy')}
                                accessibilityRole="link"
                            >
                                Privacy Policy
                            </Text>
                            {' '}and{' '}
                            <Text
                                style={{ color: colors.primary }}
                                onPress={() => Linking.openURL('https://ravyn.app/terms')}
                                accessibilityRole="link"
                            >
                                Terms of Service
                            </Text>
                            .
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    // ─── Button logic ─────────────────────────────────────

    const currentStepData = STEPS[step];
    const isPermissionStep = (currentStepData as any).isPermission;
    const isAuthStep = (currentStepData as any).isAuth;
    const isWelcomeStep = (currentStepData as any).isWelcome;
    const accountStepIndex = STEPS.findIndex(s => s.id === 'account');

    // Hide footer on permission step (until granted) and auth step (has its own buttons)
    const showFooterButton = !isAuthStep && (!isPermissionStep || notifGranted !== null);

    const getButtonLabel = () => {
        if (loading) return 'INITIALIZING...';
        if (isWelcomeStep) return 'GET STARTED';
        if (isPermissionStep && notifGranted !== null) return 'CONTINUE';
        return 'CONTINUE';
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.primaryMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.accentMuted }]} />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex}
            >
                {/* Header: Back | Dots | Skip */}
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => changeStep(step - 1)}
                        disabled={step === 0}
                        style={[styles.navBtn, { opacity: step > 0 ? 1 : 0 }]}
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                        accessibilityState={{ disabled: step === 0 }}
                    >
                        <Text style={[styles.navText, { color: colors.textSecondary }]}>Back</Text>
                    </TouchableOpacity>

                    <View style={styles.dotsRow}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: i <= step ? colors.primary : colors.divider,
                                        width: i === step ? 20 : 6,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Skip to sign up on middle steps */}
                    {!isWelcomeStep && !isAuthStep ? (
                        <TouchableOpacity
                            style={styles.navBtn}
                            onPress={() => changeStep(accountStepIndex)}
                            accessibilityRole="button"
                            accessibilityLabel="Skip to account setup"
                        >
                            <Text style={[styles.navText, { color: colors.textMuted }]}>Skip</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ minWidth: 60 }} />
                    )}
                </View>

                {/* Main Content — no card, content on background */}
                <Animated.ScrollView
                    contentContainerStyle={styles.scrollContent}
                    style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderContent()}
                </Animated.ScrollView>

                {/* Action Footer */}
                {showFooterButton && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                { backgroundColor: colors.primary },
                                loading && { opacity: 0.7 }
                            ]}
                            activeOpacity={0.9}
                            disabled={loading}
                            onPress={() => changeStep(step + 1)}
                        >
                            <Text style={[styles.actionBtnText, { color: colors.primaryContrast }]}>
                                {getButtonLabel()}
                            </Text>
                        </TouchableOpacity>

                        {/* Skip option for permission step */}
                        {isPermissionStep && notifGranted === null && (
                            <TouchableOpacity
                                style={styles.skipBtn}
                                onPress={() => {
                                    setNotifGranted(false);
                                    changeStep(step + 1);
                                }}
                            >
                                <Text style={[styles.skipText, { color: colors.textMuted }]}>
                                    Skip for now
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </KeyboardAvoidingView>
            <KeyboardToolbar />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backdropLayer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    backdropOrbTop: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 999,
        top: -150,
        right: -120,
        opacity: 0.55,
    },
    backdropOrbBottom: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 999,
        bottom: -140,
        left: -90,
        opacity: 0.35,
    },
    flex: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        height: 50,
    },
    navBtn: {
        padding: spacing.sm,
        minWidth: 60,
    },
    navText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    stepCounter: {
        minWidth: 60,
        textAlign: 'right',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
    },
    dotsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingBottom: 24,
        paddingTop: 16,
    },
    textContainer: {
        width: '100%',
    },
    // Welcome
    welcomeWrap: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    welcomeLogo: {
        fontFamily: 'Georgia',
        fontSize: 64,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'lowercase',
        marginBottom: spacing.xxl,
    },
    welcomeDivider: {
        width: 32,
        height: 1.5,
        marginBottom: spacing.xxl,
        opacity: 0.6,
    },
    superTitle: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 3,
        marginBottom: spacing.xl,
    },
    mainTitle: {
        fontFamily: 'Georgia',
        fontSize: 48,
        lineHeight: 56,
        fontWeight: '400',
        marginBottom: spacing.xl,
    },
    bodyText: {
        fontSize: 16,
        lineHeight: 26,
        opacity: 0.6,
    },
    // Inputs
    inputsRow: {
        flexDirection: 'row',
        gap: spacing.xxl,
        marginTop: spacing.md,
    },
    timeBlock: {
        gap: spacing.xs,
    },
    label: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
    },
    timeInput: {
        fontSize: 28,
        fontFamily: 'Georgia',
        borderBottomWidth: 1,
        paddingBottom: 4,
        minWidth: 80,
    },
    // Permission
    permissionBlock: {
        marginTop: spacing.xl,
        alignItems: 'center',
    },
    permissionBtn: {
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        borderRadius: borderRadius.full,
        alignItems: 'center',
    },
    permissionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 2,
    },
    permissionStatus: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: spacing.sm,
    },
    // Commit Block
    commitBlock: {
        marginTop: spacing.xs,
        width: '100%',
    },
    taskInput: {
        fontSize: 20,
        padding: spacing.lg,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        textAlignVertical: 'top',
        minHeight: 80,
    },
    chipsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.lg,
    },
    chip: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: borderRadius.full,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    calendarWrap: {
        marginTop: spacing.lg,
        height: 300,
        overflow: 'hidden',
    },
    // Footer
    footer: {
        paddingHorizontal: 28,
        paddingBottom: spacing.xl,
        paddingTop: spacing.md,
    },
    actionBtn: {
        height: 58,
        borderRadius: borderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 2,
    },
    skipBtn: {
        alignItems: 'center',
        paddingTop: spacing.md,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '500',
    },
    // Auth step
    authBlock: {
        width: '100%',
    },
    authInputGroup: {
        marginBottom: spacing.md,
    },
    authInputContainer: {
        height: 52,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    authInputIconLeft: {
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
    },
    authInputIconRight: {
        padding: spacing.sm,
        paddingRight: spacing.md,
    },
    authInputField: {
        flex: 1,
        height: '100%',
        fontSize: typography.bodyLarge.fontSize,
        fontWeight: '500',
    },
    authErrorText: {
        marginTop: spacing.xs,
        fontSize: typography.caption.fontSize,
        marginLeft: spacing.xs,
    },
    authSubmitBtn: {
        height: 52,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        ...shadows.sm,
    },
    authSubmitText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    authToggle: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    authToggleText: {
        fontSize: 13,
    },
    authDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.sm,
    },
    authDividerLine: {
        flex: 1,
        height: 1,
    },
    authDividerText: {
        marginHorizontal: spacing.md,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    authSocialBlock: {
        gap: spacing.sm,
    },
    authSocialBtn: {
        height: 48,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        ...shadows.sm,
    },
    authSocialIconWrap: {
        width: 24,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    authSocialLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.1,
    },
    skipAccountBtn: {
        alignItems: 'center',
        paddingTop: spacing.xl,
        paddingBottom: spacing.sm,
    },
    consentText: {
        fontSize: 11,
        lineHeight: 17,
        textAlign: 'center',
        marginTop: spacing.md,
        opacity: 0.7,
        paddingHorizontal: spacing.sm,
    },
    skipAccountText: {
        fontSize: 13,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
