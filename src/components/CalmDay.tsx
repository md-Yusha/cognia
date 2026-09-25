import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speakPrompt } from '../services/ttsService';
import { CheckCircle2, Droplets, Sun, Moon, Home } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const OBJECTS = [
  { emoji: '🏠', name: 'Home' },
  { emoji: '🫖', name: 'Tea' },
  { emoji: '💧', name: 'Water' },
  { emoji: '🍚', name: 'Rice' },
];

function dayPart(date = new Date()) {
  const hour = date.getHours();
  const day = date.toLocaleDateString(undefined, { weekday: 'long' });
  if (hour < 11) return { day, when: 'morning', meal: 'Breakfast is the next meal.', dusk: false, icon: '🌅' };
  if (hour < 16) return { day, when: 'afternoon', meal: 'Lunch is the next meal.', dusk: false, icon: '☀️' };
  if (hour < 21) return { day, when: 'evening', meal: 'Dinner is almost ready.', dusk: true, icon: '🌇' };
  return { day, when: 'night', meal: 'It is time to rest.', dusk: true, icon: '🌙' };
}

export function CalmDay({ patientName }: { patientName: string }) {
  const clock = dayPart();
  const [waterDone, setWaterDone] = useState(false);
  const waterKey = `cognia_water_${new Date().toDateString()}`;

  useEffect(() => {
    AsyncStorage.getItem(waterKey).then((value) => setWaterDone(value === 'yes'));
  }, [waterKey]);

  useEffect(() => {
    if (!clock.dusk) return;
    const key = `cognia_dusk_${new Date().toDateString()}`;
    AsyncStorage.getItem(key).then((value) => {
      if (value) return;
      AsyncStorage.setItem(key, '1');
      speakPrompt(`Good evening ${patientName}. You are safe at home. ${clock.meal}`);
    });
  }, [clock.dusk, clock.meal, patientName]);

  const markWater = async () => {
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setWaterDone(true);
    await AsyncStorage.setItem(waterKey, 'yes');
    speakPrompt('Good job. You had fresh water.');
  };

  return (
    <View className="mb-4">
      {/* Time & Environment Anchor Card */}
      <View 
        className={`rounded-[28px] p-5 mb-3 border ${
          clock.dusk 
            ? 'bg-[#15231B] border-[#2C4837]' 
            : 'bg-[#F0F9F4] border-[#CCEAD7]'
        }`}
        style={{
          shadowColor: clock.dusk ? '#000000' : '#16704A',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <View className="items-center mb-1">
          <Text className="text-4xl mb-1">{clock.icon}</Text>
          <Text 
            className={`text-2xl font-bold text-center ${
              clock.dusk ? 'text-[#F1F5F9]' : 'text-[#143825]'
            }`}
            style={{ fontFamily: 'Nunito-Bold' }}
          >
            You are safe at home
          </Text>
          <Text 
            className={`text-lg text-center mt-1 font-semibold ${
              clock.dusk ? 'text-[#94A3B8]' : 'text-[#3D7351]'
            }`}
            style={{ fontFamily: 'Nunito-SemiBold' }}
          >
            It is {clock.day} {clock.when}. {clock.meal}
          </Text>
        </View>
      </View>

      {/* Everyday Objects Recognition Bar */}
      <View className="flex-row justify-between mb-3">
        {OBJECTS.map((item) => (
          <TouchableOpacity
            key={item.name}
            activeOpacity={0.8}
            onPress={() => {
              try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
              speakPrompt(`This is ${item.name}.`);
            }}
            className="w-[23%] bg-white rounded-2xl py-3 items-center border border-[#EDE7DD]"
            style={{
              shadowColor: '#473E35',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 1,
            }}
          >
            <Text className="text-3xl mb-1">{item.emoji}</Text>
            <Text 
              className="text-[#1E293B] text-xs font-bold"
              style={{ fontFamily: 'Nunito-Bold' }}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Hydration Reminder Tracker Card */}
      <View 
        className={`rounded-[28px] p-5 border ${
          waterDone 
            ? 'bg-[#F0FDF4] border-[#BBF7D0]' 
            : 'bg-[#FFF8F3] border-[#FBDCC8]'
        }`}
        style={{
          shadowColor: waterDone ? '#16704A' : '#9A431D',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-3">
            <View className={`w-12 h-12 rounded-2xl items-center justify-center mr-3 ${
              waterDone ? 'bg-[#DCFCE7] border border-[#86EFAC]' : 'bg-white border border-[#FAD0B6]'
            }`}>
              <Text className="text-2xl">{waterDone ? '✅' : '💧'}</Text>
            </View>
            <View className="flex-1">
              <Text 
                className={`text-lg font-bold ${
                  waterDone ? 'text-[#166534]' : 'text-[#9A431D]'
                }`}
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                {waterDone ? 'Hydration Done' : 'Drink Fresh Water'}
              </Text>
              <Text 
                className="text-[#64748B] text-sm font-semibold"
                style={{ fontFamily: 'Nunito-SemiBold' }}
              >
                {waterDone ? 'Great job drinking water today!' : 'Have a cup of water or warm tea'}
              </Text>
            </View>
          </View>

          {!waterDone ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={markWater}
              className="bg-[#16704A] px-4 py-2.5 rounded-full flex-row items-center"
              style={{
                shadowColor: '#16704A',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text 
                className="text-white text-sm font-bold mr-1"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                I drank water
              </Text>
              <CheckCircle2 size={14} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
