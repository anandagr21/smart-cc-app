import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, padded = true, className = '', ...props }) => {
  return (
    <View 
      className={`bg-surface/95 rounded-2xl border border-white/5 overflow-hidden shadow-lg shadow-black/20 ${padded ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
