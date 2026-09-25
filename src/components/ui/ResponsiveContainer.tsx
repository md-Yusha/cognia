import React from 'react';
import { View, ViewStyle, Platform } from 'react-native';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  style,
  maxWidth = 'md',
}) => {
  let maxWClass = 'max-w-xl';
  if (maxWidth === 'sm') maxWClass = 'max-w-sm';
  if (maxWidth === 'md') maxWClass = 'max-w-md';
  if (maxWidth === 'lg') maxWClass = 'max-w-2xl';
  if (maxWidth === 'full') maxWClass = 'max-w-full';

  return (
    <View 
      className={`w-full mx-auto ${maxWClass} ${className}`}
      style={[
        Platform.OS === 'web' ? { width: '100%' } : undefined,
        style
      ]}
    >
      {children}
    </View>
  );
};
