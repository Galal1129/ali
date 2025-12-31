import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Lock, User, Trash2, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Haptics from 'expo-haptics';
import { usePin } from '@/contexts/PinContext';

export default function PinSettings() {
  const router = useRouter();
  const { resetPinVerification } = usePin();
  const [pinExists, setPinExists] = useState(false);
  const [userName, setUserName] = useState('');
  const [currentUserName, setCurrentUserName] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingPin, setCheckingPin] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('app_security')
        .select('user_name')
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPinExists(true);
        setCurrentUserName(data.user_name);
      }
    } catch (error) {
      console.error('Error checking PIN status:', error);
    } finally {
      setCheckingPin(false);
    }
  };

  const hashPin = async (pinValue: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pinValue);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleSetPin = async () => {
    if (!userName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم المستخدم');
      return;
    }

    if (pin.length !== 4) {
      Alert.alert('خطأ', 'رقم PIN يجب أن يكون 4 أرقام');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('خطأ', 'رقم PIN غير متطابق');
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      Alert.alert('خطأ', 'رقم PIN يجب أن يحتوي على أرقام فقط');
      return;
    }

    setLoading(true);

    try {
      const pinHash = await hashPin(pin);

      if (pinExists) {
        const { error } = await supabase
          .from('app_security')
          .update({
            user_name: userName.trim(),
            pin_hash: pinHash,
          })
          .eq('id', (await supabase.from('app_security').select('id').single()).data?.id);

        if (error) throw error;

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert('نجح', 'تم تحديث رقم PIN بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
      } else {
        const { error } = await supabase.from('app_security').insert({
          user_name: userName.trim(),
          pin_hash: pinHash,
        });

        if (error) throw error;

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        Alert.alert('نجح', 'تم تعيين رقم PIN بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
      }

      setPin('');
      setConfirmPin('');
      setUserName('');
      await checkPinStatus();
    } catch (error: any) {
      console.error('Error setting PIN:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ رقم PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePin = () => {
    Alert.alert('تأكيد الحذف', 'هل أنت متأكد من حذف رقم PIN؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('app_security')
              .delete()
              .eq('id', (await supabase.from('app_security').select('id').single()).data?.id);

            if (error) throw error;

            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            Alert.alert('نجح', 'تم حذف رقم PIN بنجاح');
            setPinExists(false);
            setCurrentUserName('');
            setUserName('');
            setPin('');
            setConfirmPin('');
          } catch (error) {
            console.error('Error deleting PIN:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء حذف رقم PIN');
          }
        },
      },
    ]);
  };

  if (checkingPin) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowRight size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إعدادات PIN</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowRight size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات PIN</Text>
      </View>

      <ScrollView style={styles.content}>
        {pinExists && (
          <View style={styles.infoCard}>
            <Lock size={32} color="#10B981" />
            <Text style={styles.infoTitle}>رقم PIN مفعل</Text>
            <Text style={styles.infoSubtitle}>المستخدم: {currentUserName}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {pinExists ? 'تغيير رقم PIN' : 'تعيين رقم PIN'}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المستخدم</Text>
            <View style={styles.inputContainer}>
              <User size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="أدخل اسم المستخدم"
                placeholderTextColor="#9CA3AF"
                value={userName}
                onChangeText={setUserName}
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم PIN (4 أرقام)</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="****"
                placeholderTextColor="#9CA3AF"
                value={pin}
                onChangeText={setPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                textAlign="right"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>تأكيد رقم PIN</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color="#6B7280" />
              <TextInput
                style={styles.input}
                placeholder="****"
                placeholderTextColor="#9CA3AF"
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                textAlign="right"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSetPin}
            disabled={loading}
          >
            <Check size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>
              {loading ? 'جاري الحفظ...' : pinExists ? 'تحديث PIN' : 'حفظ PIN'}
            </Text>
          </TouchableOpacity>
        </View>

        {pinExists && (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeletePin}>
            <Trash2 size={20} color="#EF4444" />
            <Text style={styles.deleteButtonText}>حذف رقم PIN</Text>
          </TouchableOpacity>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>معلومات مهمة</Text>
          <Text style={styles.infoSectionText}>
            • رقم PIN يجب أن يكون 4 أرقام{'\n'}
            • احفظ رقم PIN في مكان آمن{'\n'}
            • سيتم طلب رقم PIN عند فتح التطبيق{'\n'}
            • يمكنك تغيير أو حذف رقم PIN في أي وقت
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'right',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#ECFDF5',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#065F46',
    marginTop: 12,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#047857',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  infoSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'right',
  },
  infoSectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    textAlign: 'right',
  },
});
