import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (pin.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (pin.length > 16) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن لا تزيد عن 16 حرف');
      return;
    }

    setIsLoading(true);
    const success = await login(pin);
    setIsLoading(false);

    if (success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('خطأ', 'كلمة المرور غير صحيحة');
      setPin('');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Lock size={64} color="#4F46E5" />
          </View>

          <Text style={styles.title}>نظام إدارة الحوالات المالية</Text>
          <Text style={styles.subtitle}>أدخل كلمة المرور (8-16 حرف)</Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={(text) => {
                if (text.length <= 16) {
                  setPin(text);
                }
              }}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              maxLength={16}
              textAlign="center"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {pin.length > 0 && (
            <View style={styles.lengthIndicator}>
              <Text style={[
                styles.lengthText,
                pin.length >= 8 && pin.length <= 16 ? styles.lengthTextValid : styles.lengthTextInvalid
              ]}>
                {pin.length} / 16 حرف
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'جاري التحقق...' : 'دخول'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: '100%',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  lengthIndicator: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  lengthText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  lengthTextValid: {
    color: '#10B981',
  },
  lengthTextInvalid: {
    color: '#F59E0B',
  },
});
