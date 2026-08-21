import React, { useState, useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import { Palette } from '../constants/theme';
import AppSplashScreen from '../components/AppSplashScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Palette.background,
    card: Palette.surface,
    text: Palette.textPrimary,
    border: Palette.border,
    primary: Palette.emerald,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Ionicons: require('../assets/fonts/Ionicons.ttf'),
    ionicons: require('../assets/fonts/Ionicons.ttf'),
  });

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={styles.loadingContainer} />;
  }

  return (
    <ThemeProvider value={CustomLightTheme}>
      <View style={styles.appWrapper}>
        <View style={styles.responsiveContainer}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Palette.background },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="add-transaction"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="transaction-detail"
              options={{
                presentation: 'modal',
                animation: 'slide_from_bottom',
                headerShown: false,
              }}
            />
          </Stack>

          {showSplash && (
            <AppSplashScreen onFinish={() => setShowSplash(false)} />
          )}
        </View>
      </View>
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  appWrapper: {
    flex: 1,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: Palette.background,
    overflow: 'hidden',
  },
});
