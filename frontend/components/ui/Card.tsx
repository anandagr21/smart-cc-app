import React from 'react';
import { View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, padded = true, className, ...props }) => {
  return (
    <View 
      className={`bg-card rounded-2xl border border-border overflow-hidden ${padded ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
};
