import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, Camera, ImageIcon, Trash2, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  pickImageFromGallery,
  pickImageFromCamera,
  uploadLogo,
  updateShopLogo,
} from '@/services/logoService';
import { getLogoUrl } from '@/utils/logoHelper';

export default function ShopSettingsScreen() {
  const router = useRouter();
  const { settings, updateSettings } = useAuth();

  const [shopName, setShopName] = useState(settings?.shop_name || '');
  const [shopPhone, setShopPhone] = useState(settings?.shop_phone || '');
  const [shopAddress, setShopAddress] = useState(settings?.shop_address || '');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCurrentLogo();
  }, []);

  const loadCurrentLogo = async () => {
    try {
      setIsLoading(true);
      const url = await getLogoUrl();
      setLogoUri(url);
    } catch (error) {
      console.error('Error loading logo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const uri = await pickImageFromGallery();
      if (uri) {
        setSelectedImageUri(uri);
      }
    } catch (error) {
      Alert.alert('خطأ', error instanceof Error ? error.message : 'فشل اختيار الصورة');
    }
  };

  const handlePickFromCamera = async () => {
    try {
      const uri = await pickImageFromCamera();
      if (uri) {
        setSelectedImageUri(uri);
      }
    } catch (error) {
      Alert.alert('خطأ', error instanceof Error ? error.message : 'فشل التقاط الصورة');
    }
  };

  const handleRemoveLogo = () => {
    Alert.alert('حذف الشعار', 'هل أنت متأكد من حذف الشعار الحالي؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setIsSaving(true);
          const success = await updateShopLogo(null);
          if (success) {
            setLogoUri(null);
            setSelectedImageUri(null);
            Alert.alert('نجح', 'تم حذف الشعار بنجاح');
            await loadCurrentLogo();
          } else {
            Alert.alert('خطأ', 'فشل حذف الشعار');
          }
          setIsSaving(false);
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!shopName.trim()) {
      Alert.alert('خطأ', 'الرجاء إدخال اسم المحل');
      return;
    }

    setIsSaving(true);

    try {
      let logoUrl: string | null = null;

      if (selectedImageUri) {
        const result = await uploadLogo(selectedImageUri);
        if (result.success && result.url) {
          logoUrl = result.url;
          await updateShopLogo(logoUrl);
        } else {
          Alert.alert('خطأ', result.error || 'فشل رفع الشعار');
          setIsSaving(false);
          return;
        }
      }

      const settingsUpdate: any = {
        shop_name: shopName,
        shop_phone: shopPhone || null,
        shop_address: shopAddress || null,
      };

      if (logoUrl) {
        settingsUpdate.shop_logo = logoUrl;
      }

      const success = await updateSettings(settingsUpdate);

      if (success) {
        Alert.alert('نجح', 'تم حفظ الإعدادات بنجاح', [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]);
        setSelectedImageUri(null);
        await loadCurrentLogo();
      } else {
        Alert.alert('خطأ', 'فشل حفظ الإعدادات');
      }
    } catch (error) {
      Alert.alert('خطأ', 'حدث خطأ أثناء الحفظ');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const displayLogoUri = selectedImageUri || logoUri;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowRight size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إعدادات المحل</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>شعار المحل</Text>

          <View style={styles.logoContainer}>
            {isLoading ? (
              <View style={styles.logoPlaceholder}>
                <ActivityIndicator size="large" color="#4F46E5" />
              </View>
            ) : displayLogoUri ? (
              <Image source={{ uri: displayLogoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <ImageIcon size={48} color="#9CA3AF" />
                <Text style={styles.placeholderText}>لا يوجد شعار</Text>
              </View>
            )}
          </View>

          <View style={styles.logoActions}>
            <TouchableOpacity
              style={styles.logoActionButton}
              onPress={handlePickFromGallery}
              disabled={isSaving}
            >
              <ImageIcon size={20} color="#4F46E5" />
              <Text style={styles.logoActionText}>اختر من المعرض</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoActionButton}
              onPress={handlePickFromCamera}
              disabled={isSaving}
            >
              <Camera size={20} color="#4F46E5" />
              <Text style={styles.logoActionText}>التقاط صورة</Text>
            </TouchableOpacity>

            {(displayLogoUri || selectedImageUri) && (
              <TouchableOpacity
                style={[styles.logoActionButton, styles.deleteButton]}
                onPress={handleRemoveLogo}
                disabled={isSaving}
              >
                <Trash2 size={20} color="#EF4444" />
                <Text style={[styles.logoActionText, styles.deleteText]}>حذف</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات المحل</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>اسم المحل *</Text>
            <TextInput
              style={styles.input}
              value={shopName}
              onChangeText={setShopName}
              placeholder="أدخل اسم المحل"
              placeholderTextColor="#9CA3AF"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              value={shopPhone}
              onChangeText={setShopPhone}
              placeholder="أدخل رقم الهاتف"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              editable={!isSaving}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>العنوان</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="أدخل عنوان المحل"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!isSaving}
            />
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>حفظ التغييرات</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'right',
  },
  logoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 16,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  logoActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  logoActionButton: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  logoActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  deleteText: {
    color: '#EF4444',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    textAlign: 'right',
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
