import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { speakPrompt } from '../services/ttsService';

const OBJECTS = [
  { emoji: '🏠', name: 'Home' },
  { emoji: '🫖', name: 'Tea' },
  { emoji: '💧', name: 'Water' },
  { emoji: '🍚', name: 'Rice' },
];

function dayPart(date = new Date()) {
  const hour = date.getHours();
  const day = date.toLocaleDateString(undefined, { weekday: 'long' });
  if (hour < 11) return { day, when: 'morning', meal: 'Breakfast is the next meal.', dusk: false };
  if (hour < 16) return { day, when: 'afternoon', meal: 'Lunch is the next meal.', dusk: false };
  if (hour < 21) return { day, when: 'evening', meal: 'Dinner is almost ready.', dusk: true };
  return { day, when: 'night', meal: 'It is time to rest.', dusk: true };
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
    setWaterDone(true);
    await AsyncStorage.setItem(waterKey, 'yes');
    speakPrompt('Good. You had water.');
  };

  return (
    <View>
      <View style={{ backgroundColor: clock.dusk ? '#2C3A32' : '#EBF4EE', borderRadius: 28, padding: 22, marginBottom: 14 }}>
        <Text style={{ fontSize: 42, textAlign: 'center' }}>🏠</Text>
        <Text style={{ fontFamily: 'PatrickHand', fontSize: 36, color: clock.dusk ? '#F4EFE6' : '#2C503A', textAlign: 'center' }}>
          You are at home
        </Text>
        <Text style={{ fontFamily: 'Nunito-SemiBold', fontSize: 22, color: clock.dusk ? '#E4D7C8' : '#3D6C4E', textAlign: 'center', marginTop: 6 }}>
          It is {clock.day} {clock.when}. {clock.meal}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
        {OBJECTS.map((item) => (
          <TouchableOpacity
            key={item.name}
            onPress={() => speakPrompt(`This is ${item.name}.`)}
            style={{ width: '23%', backgroundColor: 'white', borderRadius: 20, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E8E2D8' }}
          >
            <Text style={{ fontSize: 36 }}>{item.emoji}</Text>
            <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 14, color: '#2B3A30', marginTop: 4 }}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ backgroundColor: '#FDF3ED', borderRadius: 28, padding: 22, marginBottom: 14, borderWidth: 1, borderColor: '#F4D8C9' }}>
        <Text style={{ fontSize: 40, textAlign: 'center' }}>💧</Text>
        <Text style={{ fontFamily: 'PatrickHand', fontSize: 34, color: '#8A4226', textAlign: 'center' }}>
          {waterDone ? 'You had water' : 'Have you had water?'}
        </Text>
        {!waterDone ? (
          <TouchableOpacity onPress={markWater} style={{ marginTop: 14, backgroundColor: '#3D6C4E', borderRadius: 999, minHeight: 64, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontFamily: 'Nunito-Bold', fontSize: 22 }}>Yes, I drank water</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
