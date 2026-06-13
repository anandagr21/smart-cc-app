import { useState, useEffect } from 'react';
import { Platform, AccessibilityInfo } from 'react-native';

/**
 * Returns `true` when the user has requested reduced motion,
 * either via OS-level accessibility settings or the
 * `prefers-reduced-motion` media query on web.
 *
 * Use this to gate animations — when true, use instant transitions,
 * disable pulse loops, and skip shimmer effects.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mq.matches);

      const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }

    // Native: check iOS/Android accessibility setting
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription?.remove();
  }, []);

  return reduceMotion;
}
