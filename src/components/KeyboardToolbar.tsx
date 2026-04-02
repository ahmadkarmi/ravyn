// Ravyn — Keyboard Toolbar
// iOS input accessory bar shown above the keyboard with a Done button.
// On Android this renders nothing — Android keyboards have a native dismiss key.

import React from 'react';
import {
    InputAccessoryView,
    View,
    TouchableOpacity,
    Text,
    Keyboard,
    Platform,
    StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, typography } from '../theme';

export const KEYBOARD_TOOLBAR_ID = 'ravyn-keyboard-toolbar';

export default function KeyboardToolbar() {
    const { colors } = useTheme();

    if (Platform.OS !== 'ios') return null;

    return (
        <InputAccessoryView nativeID={KEYBOARD_TOOLBAR_ID}>
            <View style={[styles.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => Keyboard.dismiss()}
                    style={styles.doneBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 16, right: 8 }}
                >
                    <Text style={[styles.doneText, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
            </View>
        </InputAccessoryView>
    );
}

const styles = StyleSheet.create({
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    doneBtn: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
    },
    doneText: {
        ...typography.bodyMedium,
        fontWeight: '600',
    },
});
