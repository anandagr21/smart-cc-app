import React from 'react';
import { View } from 'react-native';

export function TransactionSkeleton() {
  return (
    <View className="py-4 px-4 border-b border-white/5 bg-surface/30">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full bg-white/5 mr-4" />
          <View className="flex-1">
            <View className="h-5 bg-white/5 rounded w-3/4 mb-2" />
            <View className="h-4 bg-white/5 rounded w-1/2" />
          </View>
        </View>
        <View className="items-end pl-4">
          <View className="h-6 bg-white/5 rounded w-20 mb-2" />
          <View className="h-4 bg-white/5 rounded w-16" />
        </View>
      </View>
    </View>
  );
}

export function TransactionListSkeleton() {
  return (
    <View className="flex-1">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <TransactionSkeleton key={i} />
      ))}
    </View>
  );
}
