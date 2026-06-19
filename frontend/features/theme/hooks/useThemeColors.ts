import { useColorScheme } from 'nativewind';
import { lightTheme, darkTheme } from '@/theme/colors';
import { useThemeStore } from '../store/themeStore';
import { useEffect, useMemo } from 'react';
import { Appearance } from 'react-native';

export function useThemeColors() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { themeMode } = useThemeStore();

  useEffect(() => {
    if (themeMode === 'system') {
      setColorScheme('system');
    } else {
      setColorScheme(themeMode);
    }
  }, [themeMode, setColorScheme]);

  // Determine actual active theme for token usage
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return Appearance.getColorScheme() === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, colorScheme]);

  return { ...(isDark ? darkTheme : lightTheme), isDark };
}
