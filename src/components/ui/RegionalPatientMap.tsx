import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MapPin, Navigation, Eye, Heart, Sparkles, ChevronRight, Activity } from 'lucide-react-native';
import { PatientProfile } from '../../types';
import * as Haptics from 'expo-haptics';

interface RegionalPatientMapProps {
  patients: PatientProfile[];
  onSelectPatient: (patient: PatientProfile) => void;
}

// Normalized coordinate lookup for Northeast India cities
const CITY_COORDINATES: Record<string, { x: number; y: number }> = {
  guwahati: { x: 38, y: 52 },
  shillong: { x: 44, y: 68 },
  jorhat: { x: 66, y: 40 },
  dibrugarh: { x: 80, y: 26 },
  tezpur: { x: 52, y: 44 },
  silchar: { x: 50, y: 84 },
  tura: { x: 24, y: 70 },
  imphal: { x: 65, y: 85 },
  agartala: { x: 30, y: 88 },
  itanagar: { x: 64, y: 28 },
};

export const RegionalPatientMap: React.FC<RegionalPatientMapProps> = ({
  patients,
  onSelectPatient,
}) => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    patients[0]?.id || null
  );

  // Pulsing animation for blinking indicators
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Color & severity resolver based on dementia stage
  const getStageColor = (stage?: string) => {
    switch (stage?.toLowerCase()) {
      case 'mild':
        return {
          bg: '#22C55E', // Green
          glow: '#BBF7D0',
          border: '#16A34A',
          label: 'Mild (Stable)',
          textColor: '#15803D',
        };
      case 'moderate':
        return {
          bg: '#EAB308', // Yellow
          glow: '#FEF08A',
          border: '#CA8A04',
          label: 'Moderate',
          textColor: '#A16207',
        };
      case 'early':
      default:
        return {
          bg: '#EF4444', // Red
          glow: '#FECDD3',
          border: '#DC2626',
          label: 'High Care',
          textColor: '#B91C1C',
        };
    }
  };

  const activeSelectedPatient =
    patients.find((p) => p.id === selectedPatientId) || patients[0];

  return (
    <View 
      className="bg-white border-2 border-[#E7E2D8] rounded-[28px] p-4.5 mb-6 overflow-hidden"
      style={{
        shadowColor: '#3A3226',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mr-2">
            <Activity size={16} color="#16704A" />
          </View>
          <View>
            <Text 
              className="text-[#1E293B] text-base font-bold"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              Regional Patient Overview
            </Text>
            <Text 
              className="text-[#64748B] text-xs font-semibold"
              style={{ fontFamily: 'Nunito-SemiBold' }}
            >
              Northeast India Patient Density & Status
            </Text>
          </View>
        </View>

        <View className="bg-[#FAF8F5] border border-[#CBD5E1] px-2.5 py-1 rounded-full">
          <Text className="text-[#16704A] text-xs font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
            {patients.length} Monitored
          </Text>
        </View>
      </View>

      {/* Styled Interactive Map Canvas */}
      <View 
        className="w-full h-56 rounded-2xl relative overflow-hidden border border-[#D5E5DA]"
        style={{ backgroundColor: '#F1F7F3' }}
      >
        {/* Stylized Regional Topography Lines / Waterways */}
        <View className="absolute inset-0 opacity-20 pointer-events-none">
          <View className="w-96 h-28 rounded-full border-4 border-[#3D7351] absolute top-10 -left-10" />
          <View className="w-80 h-32 rounded-full border-2 border-[#3D7351] absolute top-20 left-24" />
          <View className="w-full h-1 bg-[#1F8A5D] absolute top-28" />
        </View>

        {/* Regional Waterway River: Brahmaputra representation */}
        <View 
          className="absolute h-3 bg-[#BAE6FD]/80 rounded-full w-full rotate-[-8deg] top-24 -left-2"
          style={{ opacity: 0.85 }}
        />

        {/* Region Label Watermarks */}
        <Text 
          className="absolute top-4 left-6 text-[#94A3B8] text-[10px] font-bold tracking-widest uppercase opacity-70 pointer-events-none"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          Assam Valley (Brahmaputra)
        </Text>
        <Text 
          className="absolute bottom-6 left-12 text-[#94A3B8] text-[10px] font-bold tracking-widest uppercase opacity-70 pointer-events-none"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          Meghalaya Plateau
        </Text>
        <Text 
          className="absolute top-8 right-6 text-[#94A3B8] text-[10px] font-bold tracking-widest uppercase opacity-70 pointer-events-none"
          style={{ fontFamily: 'Nunito-Bold' }}
        >
          Upper Assam (Tea Gardens)
        </Text>

        {/* Patient Location Markers with Blinking Pulsing Dots */}
        {patients.map((patient, index) => {
          const cityKey = (patient.city || 'guwahati').toLowerCase().trim();
          const coords = CITY_COORDINATES[cityKey] || {
            x: 30 + ((index * 22) % 60),
            y: 35 + ((index * 18) % 45),
          };
          const stageStyle = getStageColor(patient.dementiaStage);
          const isSelected = selectedPatientId === patient.id;

          return (
            <TouchableOpacity
              key={patient.id}
              activeOpacity={0.8}
              onPress={() => {
                try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                setSelectedPatientId(patient.id);
              }}
              style={{
                position: 'absolute',
                left: `${coords.x}%`,
                top: `${coords.y}%`,
                transform: [{ translateX: -14 }, { translateY: -14 }],
                alignItems: 'center',
                zIndex: isSelected ? 30 : 10,
              }}
            >
              {/* Pulsing Outer Blink Wave */}
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: stageStyle.glow,
                  opacity: 0.8,
                  transform: [{ scale: pulseAnim }],
                }}
              />

              {/* Central Solid Indicator Pin */}
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: stageStyle.bg,
                  borderWidth: isSelected ? 3 : 2,
                  borderColor: isSelected ? '#1E293B' : '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.25,
                  shadowRadius: 3,
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </View>

              {/* City Name Label Tag */}
              <View 
                className={`mt-1 px-2 py-0.5 rounded-full border ${
                  isSelected 
                    ? 'bg-[#1E293B] border-[#0F172A]' 
                    : 'bg-white/95 border-[#CBD5E1]'
                }`}
              >
                <Text
                  className={`text-[9px] font-bold ${
                    isSelected ? 'text-white' : 'text-[#334155]'
                  }`}
                  style={{ fontFamily: 'Nunito-Bold' }}
                  numberOfLines={1}
                >
                  {patient.name.split(' ')[0]} ({patient.city || 'NER'})
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected Patient Floating Info Card */}
      {activeSelectedPatient ? (
        <View className="mt-3 bg-[#FAF8F5] border border-[#E2DDD5] p-3.5 rounded-2xl flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <View 
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: getStageColor(activeSelectedPatient.dementiaStage).bg,
                marginRight: 8,
              }}
            />
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text 
                  className="text-sm text-[#1E293B] font-bold mr-1.5"
                  style={{ fontFamily: 'Nunito-Bold' }}
                  numberOfLines={1}
                >
                  {activeSelectedPatient.name}
                </Text>
                <Text 
                  className="text-xs text-[#64748B] font-semibold"
                  style={{ fontFamily: 'Nunito-SemiBold' }}
                >
                  • {activeSelectedPatient.city || 'Guwahati'}
                </Text>
              </View>

              <Text 
                className="text-[11px] font-bold mt-0.5"
                style={{
                  fontFamily: 'Nunito-Bold',
                  color: getStageColor(activeSelectedPatient.dementiaStage).textColor,
                }}
              >
                Stage: {getStageColor(activeSelectedPatient.dementiaStage).label} • Code: {activeSelectedPatient.accessCode}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onSelectPatient(activeSelectedPatient)}
            activeOpacity={0.84}
            className="bg-[#16704A] px-3 py-1.5 rounded-full flex-row items-center"
          >
            <Text className="text-white text-xs font-bold mr-1" style={{ fontFamily: 'Nunito-Bold' }}>
              View
            </Text>
            <ChevronRight size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Color Code Legend */}
      <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-[#F1EBE1] px-1">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-[#22C55E] mr-1.5" />
          <Text className="text-[11px] text-[#475569] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
            Mild (Stable)
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-[#EAB308] mr-1.5" />
          <Text className="text-[11px] text-[#475569] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
            Moderate
          </Text>
        </View>

        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full bg-[#EF4444] mr-1.5" />
          <Text className="text-[11px] text-[#475569] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
            High Care
          </Text>
        </View>
      </View>
    </View>
  );
};
