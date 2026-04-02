// Ravyn — Error Boundary
// Catches unhandled JS errors and shows a friendly recovery screen
// instead of a white/blank page crash.

import React, { Component, ErrorInfo } from 'react';
import * as Sentry from '@sentry/react-native';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    children: React.ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
    }

    handleRestart = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="warning-outline" size={36} color="#E06C75" />
                    </View>

                    <Text style={styles.title}>Something went wrong</Text>
                    <Text style={styles.message}>
                        The app ran into an unexpected error. Your data is safe — try restarting.
                    </Text>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={this.handleRestart}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={18} color="#FFF" />
                        <Text style={styles.buttonText}>Try Again</Text>
                    </TouchableOpacity>

                    {__DEV__ && this.state.error && (
                        <ScrollView style={styles.debugBox} showsVerticalScrollIndicator={false}>
                            <Text style={styles.debugTitle}>Debug Info</Text>
                            <Text style={styles.debugText} selectable>
                                {this.state.error.toString()}
                            </Text>
                        </ScrollView>
                    )}
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F11',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    content: {
        alignItems: 'center',
        maxWidth: 340,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(224, 108, 117, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F5F5F7',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 15,
        color: '#8E8E93',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#C0654A',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    debugBox: {
        marginTop: 24,
        maxHeight: 160,
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        padding: 12,
    },
    debugTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8E8E93',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    debugText: {
        fontSize: 12,
        color: '#E06C75',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
});
