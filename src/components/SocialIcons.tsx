// Brand-compliant social provider icons as React Native SVG paths
// Built with react-native-svg since @expo/vector-icons doesn't include newer brand marks

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Path, G, Defs, ClipPath, Rect, Circle, Line } from 'react-native-svg';

interface IconProps {
    size?: number;
    color?: string;
}

// ─── Google "G" ─────────────────────────────────────
// Official 4-color Google G per brand guidelines
export function GoogleIcon({ size = 20 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </Svg>
    );
}

// ─── Apple  ─────────────────────────────────────────
// Apple logo per brand guidelines
export function AppleIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </Svg>
    );
}

// ─── X (Twitter) ────────────────────────────────────
// Official X logo
export function XIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </Svg>
    );
}

// ─── Facebook "f" ───────────────────────────────────
// Official Facebook f per brand guidelines
export function FacebookIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
            <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </Svg>
    );
}

// ─── UI Icons ───────────────────────────────────────

export function MailIcon({ size = 20, color = '#666' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <Path d="M22 6l-10 7L2 6" />
        </Svg>
    );
}

export function LockIcon({ size = 20, color = '#666' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <Path d="M7 11V7a5 5 0 0110 0v4" />
        </Svg>
    );
}

export function EyeIcon({ size = 20, color = '#666' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <Circle cx="12" cy="12" r="3" />
        </Svg>
    );
}

export function EyeOffIcon({ size = 20, color = '#666' }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
            <Path d="M1 1l22 22" />
        </Svg>
    );
}

export default {
    GoogleIcon,
    AppleIcon,
    XIcon,
    FacebookIcon,
    MailIcon,
    LockIcon,
    EyeIcon,
    EyeOffIcon,
};
