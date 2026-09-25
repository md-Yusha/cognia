import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'sage' | 'peach' | 'lavender' | 'sky' | 'dark' | 'glass';
  className?: string;
  style?: ViewStyle;
  onPress?: () => void;
  activeOpacity?: number;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  variant = 'default',
  className = '', 
  style,
  onPress,
  activeOpacity = 0.85,
}) => {
  let bgClasses = 'bg-white border-[#EDE7DD]';
  let shadowColor = '#473E35';

  if (variant === 'sage') {
    bgClasses = 'bg-[#F2F9F5] border-[#CDE5D6]';
    shadowColor = '#1F6B4F';
  } else if (variant === 'peach') {
    bgClasses = 'bg-[#FFF8F3] border-[#FBDCC8]';
    shadowColor = '#9A431D';
  } else if (variant === 'lavender') {
    bgClasses = 'bg-[#F8F6FB] border-[#E3D7EE]';
    shadowColor = '#6A4690';
  } else if (variant === 'sky') {
    bgClasses = 'bg-[#F1F8FA] border-[#CCE7EF]';
    shadowColor = '#216174';
  } else if (variant === 'dark') {
    bgClasses = 'bg-[#15231B] border-[#2C4837]';
    shadowColor = '#000000';
  } else if (variant === 'glass') {
    bgClasses = 'bg-white/85 border-white/60';
    shadowColor = '#000000';
  }

  const containerClasses = `rounded-[28px] p-5 border ${bgClasses} ${className}`;
  const containerStyle: ViewStyle = {
    shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={activeOpacity}
        onPress={() => {
          try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
          onPress();
        }}
        className={containerClasses}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses} style={containerStyle}>
      {children}
    </View>
  );
};
