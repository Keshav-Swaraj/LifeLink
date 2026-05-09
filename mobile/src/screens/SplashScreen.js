import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SplashScreen({ onFinish, isAuthLoading }) {
  // Animation values
  const logoWidth = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    // 1. Logo wipe effect from left to right (width 0 -> 90)
    Animated.sequence([
      Animated.timing(logoWidth, {
        toValue: 90,
        duration: 1000,
        useNativeDriver: false, // width animation doesn't support native driver
      }),
      // 2. Text fades in after logo is drawn
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // 3. Short pause before finishing
      Animated.delay(1000)
    ]).start(() => {
      setAnimationDone(true);
    });
  }, []);

  useEffect(() => {
    // Only transition to the homepage when BOTH the animation is done AND auth is done loading
    if (animationDone && !isAuthLoading) {
      onFinish();
    }
  }, [animationDone, isAuthLoading, onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        
        {/* Fixed container for Logo to prevent layout shifts */}
        <View style={styles.logoContainer}>
          <Animated.View style={[styles.logoWipeContainer, { width: logoWidth }]}>
            <View style={styles.logoInner}>
              {/* Replace the Ionicons below with your image if you prefer:
                  <Image source={require('../../assets/logo.png')} style={{ width: 80, height: 80, resizeMode: 'contain' }} /> 
              */}
              <Ionicons name="pulse" size={80} color="#FF3355" />
            </View>
          </Animated.View>
        </View>

        {/* Fixed text container */}
        <Animated.View style={{ opacity: textOpacity, marginLeft: 5 }}>
          <Text style={styles.title}>LifeLink</Text>
        </Animated.View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b', // dark background to match the image
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWipeContainer: {
    height: 90,
    position: 'absolute',
    left: 0,
    overflow: 'hidden', // hides the right part of the logo when width is small
  },
  logoInner: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 56,
    fontWeight: '900',
    color: '#FF3355', // red color matching the logo
    letterSpacing: 0.5,
  },
});
