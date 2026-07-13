import { useEffect, useRef } from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Checks for and downloads OTA updates via expo-updates.
 * Runs on mount and every time the app returns to foreground.
 * Prompts the user to restart once an update is downloaded.
 */
export function useAppUpdates() {
  // Prevent concurrent checks
  const isFetching = useRef(false);
  // Avoid showing multiple prompts in the same session
  const didPrompt = useRef(false);

  useEffect(() => {
    // expo-updates is only meaningful in release builds
    if (__DEV__) return;

    const checkForUpdates = async () => {
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          const result = await Updates.fetchUpdateAsync();

          if (result.isNew && !didPrompt.current) {
            didPrompt.current = true;

            Alert.alert(
              'Update Available',
              'A new version has been downloaded. Restart now to apply it?',
              [
                { text: 'Later', style: 'cancel' },
                {
                  text: 'Restart',
                  style: 'default',
                  onPress: async () => {
                    await Updates.reloadAsync();
                  },
                },
              ],
            );
          }
        }
      } catch {
        // Best-effort: silently ignore failures (offline, network error, etc.)
      } finally {
        isFetching.current = false;
      }
    };

    checkForUpdates();

    // Re-check when the user returns to the app
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        checkForUpdates();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
