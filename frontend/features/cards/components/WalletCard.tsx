import React from 'react';
import { View, Text } from 'react-native';
import { CreditCard, CheckCircle2 } from 'lucide-react-native';
import { AnimatedContainer } from '../../../components/ui/AnimatedContainer';
import { UserCardResponse } from '../types/api';
import { colors } from '../../../theme/colors';

interface WalletCardProps {
  card: UserCardResponse;
  index: number;
}

const getNetworkColor = (network: string) => {
  const n = network.toLowerCase();
  if (n.includes('visa')) return '#1A1F71';
  if (n.includes('mastercard')) return '#EB001B';
  if (n.includes('amex') || n.includes('american express')) return '#002663';
  if (n.includes('discover')) return '#F9A021';
  return colors.accent;
};

export const WalletCard: React.FC<WalletCardProps> = ({ card, index }) => {
  const delay = 100 + index * 100;
  const networkColor = card.card_details ? getNetworkColor(card.card_details.network) : colors.accent;

  return (
    <AnimatedContainer delay={delay}>
      <View 
        className="rounded-3xl border border-white/10 mb-4 overflow-hidden shadow-lg shadow-black/40"
        style={{ backgroundColor: colors.surface }}
      >
        {/* Top Gradient Bar based on Network */}
        <View 
          className="h-2 w-full opacity-80" 
          style={{ backgroundColor: networkColor }} 
        />
        
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1 pr-4">
              <Text className="text-textPrimary text-2xl font-bold tracking-tight">
                {card.nickname || card.card_details?.card_name || 'Credit Card'}
              </Text>
              <Text className="text-textMuted text-sm font-medium mt-1 uppercase tracking-wider">
                {card.card_details?.bank_name || 'Unknown Bank'}
              </Text>
            </View>
            <View className="bg-white/5 p-2 rounded-full border border-white/5">
              {/* @ts-ignore */}
              <CreditCard size={24} color={networkColor} />
            </View>
          </View>

          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-textSecondary text-xs uppercase tracking-widest mb-1">Network</Text>
              <Text className="text-textPrimary font-semibold tracking-wide">
                {card.card_details?.network || 'Unknown'}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
                {/* @ts-ignore */}
                <CheckCircle2 size={14} color={colors.accent} />
                <Text className="text-accent text-xs font-bold ml-1.5 uppercase tracking-wider">Active</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </AnimatedContainer>
  );
};
