// Ravyn — App Rating Service
// Requests a store review once: after a 7-day streak or 10 total closures.

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATING_PROMPTED_KEY = '@ravyn:rating_prompted';

export async function maybeRequestReview(streak: number, totalClosedEver: number): Promise<void> {
    try {
        const alreadyPrompted = await AsyncStorage.getItem(RATING_PROMPTED_KEY);
        if (alreadyPrompted) return;

        const meetsThreshold = streak >= 7 || totalClosedEver >= 10;
        if (!meetsThreshold) return;

        const isAvailable = await StoreReview.isAvailableAsync();
        if (!isAvailable) return;

        await StoreReview.requestReview();
        await AsyncStorage.setItem(RATING_PROMPTED_KEY, 'true');
    } catch {
        // Store review is best-effort; never crash on failure
    }
}
