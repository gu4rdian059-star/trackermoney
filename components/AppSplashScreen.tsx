import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Palette, Spacing, Radius } from '../constants/theme';

interface AppSplashScreenProps {
  onFinish: () => void;
}

export default function AppSplashScreen({ onFinish }: AppSplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation: fade in and scale up gently
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // After brief display, fade out seamlessly into the dashboard
    const timer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1100);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, containerOpacity, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Emblem Box */}
        <View style={styles.logoBadge}>
          <Image
            source={require('../assets/images/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Brand Name & Tagline */}
        <Text style={styles.brandTitle}>CatatKas</Text>
        <Text style={styles.brandSubtitle}>Pencatat Keuangan Pribadi</Text>

        {/* Minimalist Loading Bar */}
        <View style={styles.loadingBarContainer}>
          <View style={styles.loadingBarFill} />
        </View>
      </Animated.View>

      <Text style={styles.footerText}>Aman • Mandiri • Praktis</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Palette.background,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: Radius.md,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Palette.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Palette.textTertiary,
    letterSpacing: 0.2,
  },
  loadingBarContainer: {
    width: 100,
    height: 3,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.full,
    marginTop: 32,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '100%',
    height: '100%',
    backgroundColor: Palette.emerald,
    borderRadius: Radius.full,
  },
  footerText: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 24,
    fontSize: 11,
    fontWeight: '600',
    color: Palette.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
