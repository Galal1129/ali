import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { usePin } from '@/contexts/PinContext';

interface PinEntryProps {
  onSuccess?: () => void;
}

export default function PinEntry() {
  const router = useRouter();
  const { verifyPin: markPinAsVerified } = usePin();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const shakeAnimation = new Animated.Value(0);

  const handleNumberPress = (num: string) => {
    if (pin.length < 8) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handleSubmit = () => {
    if (pin.length < 6) {
      setError('رقم PIN يجب أن يكون 6 أرقام على الأقل');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      shakeError();
      return;
    }
    verifyEnteredPin(pin);
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setError('');

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const verifyEnteredPin = async (enteredPin: string) => {
    try {
      // Import crypto for hashing
      const encoder = new TextEncoder();
      const data = encoder.encode(enteredPin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { supabase } = await import('@/lib/supabase');
      const { data: securityData, error: fetchError } = await supabase
        .from('app_security')
        .select('pin_hash')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (securityData && securityData.pin_hash === hashHex) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        markPinAsVerified();
        router.replace('/(tabs)');
      } else {
        setError('رقم PIN غير صحيح');
        setPin('');
        shakeError();

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setError('حدث خطأ أثناء التحقق');
      setPin('');
    }
  };

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderPinDots = () => {
    return (
      <View style={styles.pinDotsContainer}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>
    );
  };

  const renderNumberPad = () => {
    const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

    return (
      <View style={styles.numberPad}>
        {numbers.map((num, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.numberButton,
              num === '✓' && styles.numberButtonSubmit,
            ]}
            onPress={() => {
              if (num === '⌫') {
                handleDelete();
              } else if (num === '✓') {
                handleSubmit();
              } else {
                handleNumberPress(num);
              }
            }}
          >
            <Text style={[
              styles.numberButtonText,
              num === '✓' && styles.numberButtonTextSubmit,
            ]}>{num}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.content}>
        <Text style={styles.title}>أدخل رقم PIN</Text>

        <Animated.View
          style={[
            styles.pinContainer,
            { transform: [{ translateX: shakeAnimation }] },
          ]}
        >
          {renderPinDots()}
        </Animated.View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        {renderNumberPad()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 60,
    textAlign: 'center',
  },
  pinContainer: {
    marginBottom: 40,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 300,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#6B7280',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  numberPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 300,
    justifyContent: 'center',
    gap: 20,
  },
  numberButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  numberButtonEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  numberButtonSubmit: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  numberButtonText: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  numberButtonTextSubmit: {
    fontSize: 36,
    fontWeight: 'bold',
  },
});
