import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { Forecast } from '../types/monthly_intelligence.types';
import { Compass } from 'lucide-react-native';

interface ForecastingSurfaceProps {
  forecasts: Forecast[];
  onPressExplain: (forecast: Forecast) => void;
}

export const ForecastingSurface: React.FC<ForecastingSurfaceProps> = ({ forecasts, onPressExplain }) => {
  const colors = useThemeColors();

  if (forecasts.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>TRAJECTORY</Text>
      
      <View style={styles.grid}>
        {forecasts.map((forecast) => (
          <TouchableOpacity 
            key={forecast.id} 
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => onPressExplain(forecast)}
          >
            <View style={styles.headerRow}>
              {/* @ts-ignore */}
              <Compass size={16} color={colors.textMuted} />
              <Text style={[styles.cardLabel, { color: colors.textMuted }]}>Forecast</Text>
            </View>
            <Text style={[styles.cardText, { color: colors.textPrimary }]} numberOfLines={3}>
              {forecast.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: tokens.fontSize.micro,
    fontWeight: tokens.fontWeight.bold,
    letterSpacing: tokens.letterSpacing.widest,
    marginBottom: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    padding: 16,
    borderRadius: tokens.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: tokens.fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: tokens.letterSpacing.wide,
  },
  cardText: {
    fontSize: tokens.fontSize.body,
    lineHeight: 22,
  },
});
