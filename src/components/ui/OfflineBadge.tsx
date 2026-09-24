import React from 'react';
import { View, Text } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';

export const OfflineBadge: React.FC = () => {
  return (
    <View className="flex-row items-center bg-[#EBF4EE] border border-[#CDE3D5] px-3.5 py-1.5 rounded-full">
      <ShieldCheck size={14} color="#437756" />
      <Text 
        className="text-[#2C503A] text-lg font-bold ml-1.5"
        style={{ fontFamily: 'Nunito-SemiBold' }}
      >
        Offline Protected
      </Text>
    </View>
  );
};
