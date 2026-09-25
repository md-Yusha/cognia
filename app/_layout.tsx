import '../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import '../src/i18n';
import { requestNotificationPermissions } from '../src/services/notificationService';
import { subscribeToAuthChanges } from '../src/services/authService';
import { useCaregiverStore } from '../src/store/useCaregiverStore';
import { View, ActivityIndicator } from 'react-native';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { StressHost } from '../src/components/StressHost';

export default function RootLayout() {
  const { setCaregiver } = useCaregiverStore();

  const [fontsLoaded] = useFonts({
    'PatrickHand': require('@expo-google-fonts/patrick-hand/400Regular/PatrickHand_400Regular.ttf'),
    'PatrickHand_400Regular': require('@expo-google-fonts/patrick-hand/400Regular/PatrickHand_400Regular.ttf'),
    'Nunito-Bold': require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    'Nunito_700Bold': require('@expo-google-fonts/nunito/700Bold/Nunito_700Bold.ttf'),
    'Nunito-SemiBold': require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
    'Nunito_600SemiBold': require('@expo-google-fonts/nunito/600SemiBold/Nunito_600SemiBold.ttf'),
    'Nunito-Regular': require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
    'Nunito_400Regular': require('@expo-google-fonts/nunito/400Regular/Nunito_400Regular.ttf'),
  });

  useEffect(() => {
    requestNotificationPermissions();
    // Subscribe to real Firebase auth changes
    const unsubscribe = subscribeToAuthChanges((caregiver) => {
      setCaregiver(caregiver);
    });
    return () => unsubscribe();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF7F2', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3D6C4E" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppErrorBoundary>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#FAF7F2' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" options={{ presentation: 'modal' }} />
          <Stack.Screen name="(caregiver)" />
          <Stack.Screen name="(patient)" />
        </Stack>
        <StressHost />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
