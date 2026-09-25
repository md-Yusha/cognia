import React from 'react';
import { Stack } from 'expo-router';

export default function PatientLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FAF7F2' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="games/memory_match" />
      <Stack.Screen name="games/daily_routine" />
      <Stack.Screen name="games/pattern_match" />
      <Stack.Screen name="games/focus_tap" />
      <Stack.Screen name="games/reminiscence" />
      <Stack.Screen name="reminders" />
      <Stack.Screen name="chat" />
    </Stack>
  );
}
