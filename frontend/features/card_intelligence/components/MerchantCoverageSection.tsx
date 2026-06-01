import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/features/theme/hooks/useThemeColors';
import { tokens } from '@/theme/tokens';
import { MerchantCoverageItem } from '../types/api';
import { Check } from 'lucide-react-native';

interface Props {
  coverage: MerchantCoverageItem[];
}

export const MerchantCoverageSection: React.FC<Props> = ({ coverage }) => {
  const colors = useThemeColors();

  if (!coverage || coverage.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Merchant Coverage</Text>
        <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No merchants associated with this card.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Merchant Coverage</Text>
      
      <View style={[styles.container, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
        {coverage.map((merchant, index) => (
          <View key={index}>
            {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
            <View style={styles.merchantRow}>
              <View style={styles.leftCol}>
                <View style={styles.nameRow}>
                  <Text style={[styles.merchantName, { color: colors.textPrimary }]}>{merchant.name}</Text>
                  <View style={[styles.typeBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.typeBadgeText, { color: colors.textSecondary }]}>{merchant.coverageType}</Text>
                  </View>
                </View>
                
                {merchant.coverageType === 'MERCHANT' ? (
                  <View style={styles.aliasesContainer}>
                    <Text style={[styles.aliasesTitle, { color: colors.textSecondary }]}>Aliases</Text>
                    {merchant.aliases.map((alias, aIdx) => (
                      <View key={aIdx} style={styles.aliasBadge}>
                        {/* @ts-ignore */}
                        <Check size={12} color={colors.success} style={{ marginRight: 4 }} />
                        <Text style={[styles.aliasText, { color: colors.textPrimary }]}>{alias}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.aliasesContainer}>
                    <Text style={[styles.aliasesTitle, { color: colors.textSecondary }]}>Category Rule Active</Text>
                    <Text style={[styles.aliasText, { color: colors.textSecondary, marginTop: 4 }]}>
                      This rule maps directly to transaction category flags instead of specific merchant aliases.
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.rightCol}>
                <Text style={[styles.coverageTitle, { color: colors.textSecondary }]}>Coverage</Text>
                <Text style={[styles.coverageValue, { color: merchant.status === '100%' ? colors.success : colors.warning }]}>
                  {merchant.status}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: tokens.spacing['2xl'],
  },
  sectionTitle: {
    fontSize: tokens.fontSize.title,
    fontFamily: 'Inter-SemiBold',
    marginBottom: tokens.spacing.lg,
  },
  emptyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  container: {
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
  },
  merchantRow: {
    flexDirection: 'row',
    padding: tokens.spacing.xl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  leftCol: {
    flex: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
    width: 100,
  },
  merchantName: {
    fontSize: tokens.fontSize.h3,
    fontFamily: 'Inter-Bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.md,
  },
  typeBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  aliasesContainer: {
    gap: tokens.spacing.sm,
  },
  aliasesTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
  },
  aliasBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aliasText: {
    fontSize: tokens.fontSize.body,
    fontFamily: 'Inter-Medium',
  },
  coverageTitle: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  coverageValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  }
});
