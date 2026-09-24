import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'warm' | 'soft' | 'lavender' | 'sky' | 'outline' | 'google' | 'danger';
  size?: 'normal' | 'large' | 'elderly';
  icon?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'elderly',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  // Subtle, relaxing pastel palette
  let bgClasses = 'bg-[#3D6C4E] active:bg-[#335B41]';
  let textClasses = 'text-white';
  let borderClasses = 'border border-[#335B41]/40';
  let shadowColor = '#2C4E38';

  if (variant === 'secondary') {
    bgClasses = 'bg-[#EBF4EE] active:bg-[#DDEEE2]';
    textClasses = 'text-[#2C503A]';
    borderClasses = 'border border-[#C2DEC8]';
    shadowColor = '#8CA392';
  } else if (variant === 'warm') {
    bgClasses = 'bg-[#C87453] active:bg-[#B36344]';
    textClasses = 'text-white';
    borderClasses = 'border border-[#A95838]/40';
    shadowColor = '#8A4226';
  } else if (variant === 'soft') {
    bgClasses = 'bg-[#FDF3ED] active:bg-[#FAE3D7]';
    textClasses = 'text-[#8A4226]';
    borderClasses = 'border border-[#F4D8C9]';
    shadowColor = '#C49B85';
  } else if (variant === 'lavender') {
    bgClasses = 'bg-[#F5F0F8] active:bg-[#EAE0F2]';
    textClasses = 'text-[#5A4172]';
    borderClasses = 'border border-[#DDD0E8]';
    shadowColor = '#9E8AA8';
  } else if (variant === 'sky') {
    bgClasses = 'bg-[#EDF6F8] active:bg-[#DFEFF3]';
    textClasses = 'text-[#2C5E6E]';
    borderClasses = 'border border-[#C6E2E9]';
    shadowColor = '#7CAAB5';
  } else if (variant === 'outline') {
    bgClasses = 'bg-white active:bg-[#FAF8F5]';
    textClasses = 'text-[#4A5568]';
    borderClasses = 'border-2 border-[#E8E2D8]';
    shadowColor = '#A09789';
  } else if (variant === 'google') {
    bgClasses = 'bg-white active:bg-[#FAF8F5]';
    textClasses = 'text-[#2D3748]';
    borderClasses = 'border border-[#E2DDD3]';
    shadowColor = '#A09789';
  } else if (variant === 'danger') {
    bgClasses = 'bg-[#DC6B6B] active:bg-[#C95555]';
    textClasses = 'text-white';
    borderClasses = 'border border-[#B84E4E]/40';
    shadowColor = '#943838';
  }

  let sizeClasses = 'min-h-[64px] py-4 px-6 rounded-full';
  let fontClasses = 'text-2xl';

  if (size === 'normal') {
    sizeClasses = 'min-h-[48px] py-2.5 px-5 rounded-full';
    fontClasses = 'text-xl';
  } else if (size === 'large') {
    sizeClasses = 'min-h-[56px] py-3.5 px-6 rounded-full';
    fontClasses = 'text-xl';
  }

  const isLightBg = variant === 'secondary' || variant === 'soft' || variant === 'lavender' || variant === 'sky' || variant === 'outline' || variant === 'google';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      className={`flex-row items-center justify-center ${bgClasses} ${borderClasses} ${sizeClasses} ${
        disabled ? 'opacity-50' : 'opacity-100'
      }`}
      style={[
        {
          shadowColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 2,
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={isLightBg ? '#2C503A' : '#FFFFFF'} 
          size="small" 
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon ? <View className="mr-2.5">{icon}</View> : null}
          <Text 
            className={`${textClasses} ${fontClasses} font-bold text-center tracking-wide`} 
            style={[{ fontFamily: 'Nunito-Bold' }, textStyle]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
