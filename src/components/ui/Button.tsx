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
  subtitle?: string;
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
  subtitle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress();
  };

  // Color variants crafted for high contrast & soothing healthcare aesthetics
  let bgClasses = 'bg-[#16704A] active:bg-[#115438]';
  let textClasses = 'text-white';
  let borderClasses = 'border border-[#0E422C]/30';
  let shadowColor = '#16704A';

  if (variant === 'secondary') {
    bgClasses = 'bg-[#EBF7F0] active:bg-[#DDF0E5]';
    textClasses = 'text-[#115438]';
    borderClasses = 'border border-[#C2E4D0]';
    shadowColor = '#609B77';
  } else if (variant === 'warm') {
    bgClasses = 'bg-[#D96B27] active:bg-[#B95217]';
    textClasses = 'text-white';
    borderClasses = 'border border-[#943E12]/30';
    shadowColor = '#D96B27';
  } else if (variant === 'soft') {
    bgClasses = 'bg-[#FFF5EE] active:bg-[#FCE6D8]';
    textClasses = 'text-[#9A431D]';
    borderClasses = 'border border-[#F7D8C4]';
    shadowColor = '#CBA086';
  } else if (variant === 'lavender') {
    bgClasses = 'bg-[#F6F2FA] active:bg-[#ECE4F4]';
    textClasses = 'text-[#58397E]';
    borderClasses = 'border border-[#E0D3ED]';
    shadowColor = '#A58DBF';
  } else if (variant === 'sky') {
    bgClasses = 'bg-[#EEF7FA] active:bg-[#DEF0F5]';
    textClasses = 'text-[#1D5C6F]';
    borderClasses = 'border border-[#C4E3ED]';
    shadowColor = '#7CAEB9';
  } else if (variant === 'outline') {
    bgClasses = 'bg-white active:bg-[#FAF8F5]';
    textClasses = 'text-[#334155]';
    borderClasses = 'border-2 border-[#E2DDD5]';
    shadowColor = '#94A3B8';
  } else if (variant === 'google') {
    bgClasses = 'bg-white active:bg-[#F8FAFC]';
    textClasses = 'text-[#1E293B]';
    borderClasses = 'border border-[#CBD5E1]';
    shadowColor = '#94A3B8';
  } else if (variant === 'danger') {
    bgClasses = 'bg-[#E11D48] active:bg-[#BE123C]';
    textClasses = 'text-white';
    borderClasses = 'border border-[#9F1239]/40';
    shadowColor = '#E11D48';
  }

  let sizeClasses = 'min-h-[64px] py-4 px-6 rounded-2xl';
  let fontClasses = 'text-2xl';

  if (size === 'normal') {
    sizeClasses = 'min-h-[46px] py-2.5 px-5 rounded-xl';
    fontClasses = 'text-lg';
  } else if (size === 'large') {
    sizeClasses = 'min-h-[56px] py-3.5 px-6 rounded-2xl';
    fontClasses = 'text-xl';
  }

  const isLightBg = variant === 'secondary' || variant === 'soft' || variant === 'lavender' || variant === 'sky' || variant === 'outline' || variant === 'google';

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={handlePress}
      disabled={disabled || loading}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      className={`flex-row items-center justify-center ${bgClasses} ${borderClasses} ${sizeClasses} ${
        disabled ? 'opacity-40' : 'opacity-100'
      }`}
      style={[
        {
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isLightBg ? 0.08 : 0.22,
          shadowRadius: 10,
          elevation: 3,
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={isLightBg ? '#115438' : '#FFFFFF'} 
          size="small" 
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon ? <View className="mr-3">{icon}</View> : null}
          <View className="items-center justify-center">
            <Text 
              className={`${textClasses} ${fontClasses} font-bold text-center tracking-wide`} 
              style={[{ fontFamily: 'Nunito-Bold' }, textStyle]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                className={`${isLightBg ? 'text-[#64748B]' : 'text-white/80'} text-sm mt-0.5 text-center`}
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
