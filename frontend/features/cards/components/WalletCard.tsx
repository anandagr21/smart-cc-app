import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CreditCard, CheckCircle2 } from 'lucide-react-native';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';
import { Card } from '../../../components/ui/Card';
import { UserCardResponse } from '../types/api';
import { useThemeColors } from '../../theme/hooks/useThemeColors';

interface WalletCardProps {
  card: UserCardResponse;
  index: number;
}

const getNetworkColor = (network: string) => {
  const n = network.toLowerCase();
  if (n.includes('visa')) return '#3B82F6'; 
  if (n.includes('mastercard')) return '#EF4444'; 
  if (n.includes('amex') || n.includes('american express')) return '#6366F1'; 
  if (n.includes('discover')) return '#F59E0B'; 
  return '#10B981'; 
};

export const WalletCard: React.FC<WalletCardProps> = ({ card, index }) => {
  const colors = useThemeColors();
  const delay = 100 + index * 100;
  const networkColor = card.card_details ? getNetworkColor(card.card_details.network) : colors.primary;

  return (
    <AnimatedContainer delay={delay}>
      <Card variant="elevated" padded={false} className="mb-5 border border-white/5 shadow-sm">

        <View className="p-6">
          <View className="flex-row justify-between items-start mb-10">
            <View className="flex-1 pr-4">
              <Text style={{ color: colors.textPrimary }} className="text-2xl font-bold tracking-tight">
                {card.nickname || card.card_details?.card_name || 'Credit Card'}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs font-semibold mt-1 uppercase tracking-widest">
                {card.card_details?.bank_name || 'Unknown Bank'}
              </Text>
            </View>
            <View style={{ backgroundColor: colors.surfaceElevated, borderColor: colors.borderHighlight, borderWidth: StyleSheet.hairlineWidth }} className="p-3 rounded-2xl shadow-sm">
              {/* @ts-ignore */}
              <CreditCard size={24} color={colors.textPrimary} />
            </View>
          </View>

          <View className="flex-row justify-between items-end">
            <View>
              <Text style={{ color: colors.textMuted }} className="text-[10px] uppercase tracking-widest mb-1.5 font-bold">Network</Text>
              <Text style={{ color: colors.textPrimary }} className="font-bold tracking-widest text-base">
                {card.card_details?.network || 'UNKNOWN'}
              </Text>
            </View>
            <View className="items-end">
              <View 
                style={{ backgroundColor: `${colors.success}1A`, borderColor: `${colors.success}33`, borderWidth: StyleSheet.hairlineWidth }}
                className="flex-row items-center px-3 py-1.5 rounded-full"
              >
                {/* @ts-ignore */}
                <CheckCircle2 size={12} color={colors.success} strokeWidth={2.5} />
                <Text style={{ color: colors.success }} className="text-[10px] font-bold ml-1.5 uppercase tracking-widest">Active</Text>
              </View>
            </View>
          </View>
        </View>
      </Card>
    </AnimatedContainer>
  );
};
