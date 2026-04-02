// Ravyn — Login Screen
// Premium email + social auth, matches Ravyn visual language
// Placed after onboarding, before main app entry

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
    ScrollView,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../theme';
import { supabase } from '../lib/supabase';
import {
    GoogleIcon, AppleIcon, XIcon, FacebookIcon,
    MailIcon, LockIcon, EyeIcon, EyeOffIcon
} from '../components/SocialIcons';
import KeyboardToolbar, { KEYBOARD_TOOLBAR_ID } from '../components/KeyboardToolbar';

// Required for OAuth redirect to complete
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

// ─── Social Provider Config ────────────────────────

interface SocialProvider {
    id: 'google' | 'apple' | 'twitter' | 'facebook';
    label: string;
    color: string;
    textColor: string;
    bordered?: boolean;
    IconComponent: React.FC<{ size?: number; color?: string }>;
}

// Only showing providers that are enabled in Supabase dashboard
const SOCIAL_PROVIDERS: SocialProvider[] = [
    { id: 'google', label: 'Continue with Google', color: '#FFFFFF', textColor: '#3C4043', bordered: true, IconComponent: GoogleIcon },
    // { id: 'apple', label: 'Continue with Apple', color: '#000000', textColor: '#FFFFFF', IconComponent: AppleIcon },
    // { id: 'twitter', label: 'Continue with X', color: '#000000', textColor: '#FFFFFF', IconComponent: XIcon },
    // { id: 'facebook', label: 'Continue with Facebook', color: '#1877F2', textColor: '#FFFFFF', IconComponent: FacebookIcon },
];

// ─── Component ─────────────────────────────────────

interface LoginScreenProps {
    onSuccess: () => void;
}

export default function LoginScreen({ onSuccess }: LoginScreenProps) {
    const { colors, isDark } = useTheme();

    // State
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [loading, setLoading] = useState(false);
    const [socialLoading, setSocialLoading] = useState<string | null>(null);

    const passwordRef = useRef<TextInput>(null);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const logoScale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const useNative = Platform.OS !== 'web';
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1, duration: 600, useNativeDriver: useNative,
            }),
            Animated.spring(slideAnim, {
                toValue: 0, damping: 20, stiffness: 90, useNativeDriver: useNative,
            }),
            Animated.spring(logoScale, {
                toValue: 1, damping: 12, stiffness: 100, useNativeDriver: useNative,
            }),
        ]).start();
    }, []);

    // ─── Email Auth ──────────────────

    const validate = () => {
        let valid = true;
        setEmailError('');
        setPasswordError('');

        if (!email.trim()) {
            setEmailError('Email is required');
            valid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Please enter a valid email');
            valid = false;
        }

        if (!password) {
            setPasswordError('Password is required');
            valid = false;
        } else if (mode === 'signup' && password.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            valid = false;
        }

        return valid;
    };

    const handleEmailAuth = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
                Alert.alert('Welcome to Ravyn', 'Your account has been created.');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password.trim(),
                });
                if (error) throw error;
            }
            // onSuccess will be triggered by AuthContext session change
        } catch (err: any) {
            Alert.alert('Auth Error', err.message ?? 'Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Please enter your email first');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                redirectTo: 'ravyn://reset-callback',
            });
            if (error) throw error;
            Alert.alert('Check your email', 'We sent you a password reset link.');
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    };

    // ─── Social Auth ────────────────

    const handleSocialAuth = async (provider: SocialProvider) => {
        setSocialLoading(provider.id);
        try {
            if (Platform.OS === 'web') {
                // On web: let Supabase redirect the browser directly.
                // After redirect, detectSessionInUrl picks up the tokens automatically.
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: provider.id,
                    options: {
                        redirectTo: window.location.origin,
                    },
                });
                if (error) throw error;
                // Browser will navigate away; no further code runs.
                return;
            }

            // On native: use WebBrowser popup + deep link redirect
            const redirectUrl = Linking.createURL('/auth-callback');

            if (redirectUrl.includes('localhost') || redirectUrl.includes('127.0.0.1')) {
                Alert.alert(
                    'Setup Warning',
                    `Your app is generating a localhost redirect URL (${redirectUrl}). This can fail on physical devices. Restart Expo with --tunnel or --host lan.`
                );
            }

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

    // ─── Render ─────────────────────

    const isSignUp = mode === 'signup';

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.backdropLayer, { pointerEvents: 'none' }]}>
                <View style={[styles.backdropOrbTop, { backgroundColor: colors.primaryMuted }]} />
                <View style={[styles.backdropOrbBottom, { backgroundColor: colors.accentMuted }]} />
            </View>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    keyboardDismissMode="on-drag"
                >
                    {/* Logo / Branding */}
                    <Animated.View style={[
                        styles.brandBlock,
                        { opacity: fadeAnim, transform: [{ scale: logoScale }] }
                    ]}>
                        <Text style={[styles.logo, { color: colors.textPrimary }]}>ravyn</Text>
                        <Text style={[styles.tagline, { color: colors.textSecondary }]}>
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </Text>
                        <Text style={[styles.supportLine, { color: colors.textMuted }]}>
                            One daily closure. No guilt spiral.
                        </Text>
                    </Animated.View>

                    {/* Form */}
                    <Animated.View style={[
                        styles.formBlock,
                        styles.authShell,
                        {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                        !isDark && shadows.md,
                    ]}>
                        {/* Email */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                Email
                            </Text>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: emailError ? colors.error : (email ? colors.primary : colors.inputBorder),
                                }
                            ]}>
                                <View style={styles.inputIconLeft}>
                                    <MailIcon color={colors.placeholder} size={20} />
                                </View>
                                <TextInput
                                    style={[styles.inputField, { color: colors.textPrimary }]}
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    placeholder="you@example.com"
                                    placeholderTextColor={colors.placeholder}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="email-address"
                                    textContentType="emailAddress"
                                    returnKeyType="next"
                                    blurOnSubmit={false}
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    value={email}
                                    onChangeText={(t) => { setEmail(t); setEmailError(''); }}
                                    editable={!loading}
                                />
                            </View>
                            {emailError ? <Text style={[styles.errorText, { color: colors.error }]}>{emailError}</Text> : null}
                        </View>

                        {/* Password */}
                        <View style={styles.inputGroup}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                                    Password
                                </Text>
                                {mode === 'signin' && (
                                    <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
                                        <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot?</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={[
                                styles.inputContainer,
                                {
                                    backgroundColor: colors.inputBackground,
                                    borderColor: passwordError ? colors.error : (password ? colors.primary : colors.inputBorder),
                                }
                            ]}>
                                <View style={styles.inputIconLeft}>
                                    <LockIcon color={colors.placeholder} size={20} />
                                </View>
                                <TextInput
                                    ref={passwordRef}
                                    inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
                                    style={[styles.inputField, { color: colors.textPrimary }]}
                                    placeholder={isSignUp ? 'Create a password' : 'Your password'}
                                    placeholderTextColor={colors.placeholder}
                                    secureTextEntry={!showPassword}
                                    textContentType={isSignUp ? 'newPassword' : 'password'}
                                    returnKeyType="done"
                                    onSubmitEditing={handleEmailAuth}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
                                    editable={!loading}
                                />
                                <TouchableOpacity
                                    style={styles.inputIconRight}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ?
                                        <EyeOffIcon color={colors.placeholder} size={20} /> :
                                        <EyeIcon color={colors.placeholder} size={20} />
                                    }
                                </TouchableOpacity>
                            </View>
                            {passwordError ? <Text style={[styles.errorText, { color: colors.error }]}>{passwordError}</Text> : null}
                        </View>

                        {/* Submit Button */}
                        <TouchableOpacity
                            style={[
                                styles.submitBtn,
                                { backgroundColor: colors.primary },
                                loading && { opacity: 0.7 },
                            ]}
                            activeOpacity={0.85}
                            onPress={handleEmailAuth}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={colors.primaryContrast} />
                            ) : (
                                <Text style={[styles.submitText, { color: colors.primaryContrast }]}>
                                    {isSignUp ? 'Create Account' : 'Sign In'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {/* Toggle mode */}
                        <TouchableOpacity
                            style={styles.toggleBtn}
                            onPress={() => setMode(isSignUp ? 'signin' : 'signup')}
                            disabled={loading}
                        >
                            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
                                {isSignUp
                                    ? 'Already have an account? '
                                    : "Don't have an account? "}
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                    {isSignUp ? 'Sign In' : 'Sign Up'}
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Divider */}
                    <Animated.View style={[styles.dividerRow, { opacity: fadeAnim }]}>
                        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                        <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
                        <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                    </Animated.View>

                    {/* Social Buttons */}
                    <Animated.View style={[
                        styles.socialBlock,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}>
                        {SOCIAL_PROVIDERS.map((provider) => {
                            const Icon = provider.IconComponent;
                            return (
                                <TouchableOpacity
                                    key={provider.id}
                                    style={[
                                        styles.socialBtn,
                                        {
                                            backgroundColor: provider.color,
                                            borderColor: provider.bordered
                                                ? colors.border
                                                : 'transparent',
                                            borderWidth: provider.bordered ? 1 : 0,
                                        },
                                        socialLoading === provider.id && { opacity: 0.7 },
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => handleSocialAuth(provider)}
                                    disabled={loading || socialLoading !== null}
                                >
                                    {socialLoading === provider.id ? (
                                        <ActivityIndicator
                                            color={provider.textColor}
                                            size="small"
                                        />
                                    ) : (
                                        <>
                                            <View style={styles.socialIconWrap}>
                                                <Icon size={20} color={provider.id === 'google' ? undefined : provider.textColor} />
                                            </View>
                                            <Text style={[
                                                styles.socialLabel,
                                                { color: provider.textColor },
                                            ]}>
                                                {provider.label}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View style={{ opacity: fadeAnim }}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                            By continuing, you agree to Ravyn's Terms of Service{'\n'}
                            and Privacy Policy.
                        </Text>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
            <KeyboardToolbar />
        </SafeAreaView>
    );
}

// ─── Styles ─────────────────────────────────────────

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
        width: 300,
        height: 300,
        borderRadius: 999,
        top: -140,
        right: -120,
        opacity: 0.6,
    },
    backdropOrbBottom: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 999,
        bottom: -160,
        left: -110,
        opacity: 0.45,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: spacing.lg,
        paddingTop: height * 0.05,
        paddingBottom: spacing.xl,
        justifyContent: 'center',
    },

    // Brand
    brandBlock: {
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    logo: {
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
        fontSize: 48,
        fontWeight: '700',
        letterSpacing: -1,
        marginBottom: spacing.xs,
    },
    tagline: {
        fontSize: typography.bodyLarge.fontSize,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    supportLine: {
        ...typography.bodySmall,
        marginTop: spacing.xs,
    },

    authShell: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        padding: spacing.lg,
        marginBottom: spacing.md,
    },

    // Form
    formBlock: {
        marginBottom: spacing.md,
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    inputLabel: {
        fontSize: typography.label.fontSize,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    inputContainer: {
        height: 52,
        borderRadius: borderRadius.md,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputIconLeft: {
        paddingLeft: spacing.md,
        paddingRight: spacing.sm,
    },
    inputIconRight: {
        padding: spacing.sm,
        paddingRight: spacing.md,
    },
    inputField: {
        flex: 1,
        height: '100%',
        fontSize: typography.bodyLarge.fontSize,
        fontWeight: '500',
    },
    errorText: {
        marginTop: spacing.xs,
        fontSize: typography.caption.fontSize,
        marginLeft: spacing.xs,
    },
    forgotText: {
        fontSize: typography.caption.fontSize,
        fontWeight: '600',
        marginBottom: spacing.xs,
        marginRight: spacing.xs,
    },
    submitBtn: {
        height: 52,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        ...shadows.sm,
    },
    submitText: {
        fontSize: typography.bodyLarge.fontSize,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    toggleBtn: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    toggleText: {
        fontSize: typography.bodySmall.fontSize,
    },

    // Divider
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: spacing.md,
        fontSize: typography.bodySmall.fontSize,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Social
    socialBlock: {
        gap: spacing.sm,
        marginBottom: spacing.xl,
    },
    socialBtn: {
        height: 50,
        borderRadius: borderRadius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...shadows.sm,
    },
    socialIconWrap: {
        width: 24,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    socialLabel: {
        fontSize: 15,
        fontWeight: '500',
        letterSpacing: 0.1,
    },

    // Footer
    footerText: {
        textAlign: 'center',
        fontSize: typography.caption.fontSize,
        lineHeight: 18,
    },
});
