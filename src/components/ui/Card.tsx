import React from 'react';
import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'sage' | 'peach' | 'lavender' | 'sky';
  className?: string;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default',
  className = '', 
  style 
}) => {
  let bgClasses = 'bg-white border-[#EFEBE4]';
  let shadowColor = '#6B5E4F';

  if (variant === 'sage') {
    bgClasses = 'bg-[#EBF4EE] border-[#CDE3D5]';
    shadowColor = '#3D6C4E';
  } else if (variant === 'peach') {
    bgClasses = 'bg-[#FDF3ED] border-[#F4D8C9]';
    shadowColor = '#8A4226';
  } else if (variant === 'lavender') {
    bgClasses = 'bg-[#F5F0F8] border-[#DDD3E7]';
    shadowColor = '#675283';
  } else if (variant === 'sky') {
    bgClasses = 'bg-[#EDF6F8] border-[#C4E3EB]';
    shadowColor = '#336B7B';
  }

  return (
    <View
      className={`rounded-[30px] p-6 border ${bgClasses} ${className}`}
      style={[
        {
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 14,
          elevation: 2,
        },
        style
      ]}
    >
      {children}
    </View>
  );
};
