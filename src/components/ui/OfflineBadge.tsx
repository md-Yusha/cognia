import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck, WifiOff } from 'lucide-react-native';

interface OfflineBadgeProps {
  label?: string;
}

export const OfflineBadge: React.FC<OfflineBadgeProps> = ({ 
  label = "Offline Ready • 100% On-Device" 
}) => {
  return (
    <View 
      className="flex-row items-center self-start bg-[#EAF7EE] border border-[#BDE5CB] px-3.5 py-1.5 rounded-full"
      style={{
        shadowColor: '#16704A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 1,
      }}
    >
      <View className="w-2 h-2 rounded-full bg-[#1F8A5D] mr-2" />
      <ShieldCheck size={14} color="#16704A" />
      <Text 
        className="text-[#145332] text-sm font-bold ml-1.5 tracking-tight"
        style={{ fontFamily: 'Nunito-Bold' }}
      >
        {label}
      </Text>
    </View>
  );
};
