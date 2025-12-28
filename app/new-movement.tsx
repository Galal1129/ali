import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  I18nManager,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Save, ArrowDownCircle, ArrowUpCircle, CheckCircle, X, FileText, Download, Search } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { Customer, Currency, CURRENCIES } from '@/types/database';
import { generateReceiptHTML, generateQRCodeData } from '@/utils/receiptGenerator';
import { getLogoBase64 } from '@/utils/logoHelper';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function NewMovementScreen() {
  const router = useRouter();
  const { customerId, customerName } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const qrRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCommissionCurrencyPicker, setShowCommissionCurrencyPicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedMovementData, setSavedMovementData] = useState<any>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_account_number: '',
    movement_type: '' as 'incoming' | 'outgoing' | '',
    amount: '',
    commission: '',
    commission_currency: 'YER' as Currency,
    currency: 'USD' as Currency,
    notes: '',
    sender_name: '',
    beneficiary_name: '',
    transfer_number: '',
  });

  useEffect(() => {
    loadCustomers();
    generateTransferNumber();
  }, []);

  const generateTransferNumber = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_transfer_number');
      if (!error && data) {
        setFormData((prev) => ({ ...prev, transfer_number: data }));
      }
    } catch (error) {
      console.error('Error generating transfer number:', error);
    }
  };

  useEffect(() => {
    if (customerId && customerName) {
      setFormData((prev) => ({
        ...prev,
        customer_id: customerId as string,
        customer_name: customerName as string,
      }));
    }
  }, [customerId, customerName]);

  useEffect(() => {
    if (formData.movement_type && formData.customer_name) {
      if (formData.movement_type === 'outgoing') {
        setFormData((prev) => ({
          ...prev,
          sender_name: prev.customer_name,
          beneficiary_name: 'علي هادي علي الرازحي',
        }));
      } else if (formData.movement_type === 'incoming') {
        setFormData((prev) => ({
          ...prev,
          sender_name: 'علي هادي علي الرازحي',
          beneficiary_name: prev.customer_name,
        }));
      }
    }
  }, [formData.movement_type, formData.customer_name]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        setCustomers(data);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.customer_id || !formData.movement_type || !formData.amount) {
      Alert.alert('خطأ', 'الرجاء إدخال جميع البيانات المطلوبة');
      return;
    }

    setIsLoading(true);
    try {
      const { data: movementNumber } = await supabase.rpc('generate_movement_number');

      const { data: insertedData, error } = await supabase
        .from('account_movements')
        .insert([
          {
            movement_number: movementNumber || `MOV-${Date.now()}`,
            customer_id: formData.customer_id,
            movement_type: formData.movement_type,
            amount: Number(formData.amount),
            currency: formData.currency,
            commission: formData.commission ? Number(formData.commission) : null,
            commission_currency: formData.commission_currency,
            notes: formData.notes.trim() || null,
            sender_name: formData.sender_name.trim() || null,
            beneficiary_name: formData.beneficiary_name.trim() || null,
            transfer_number: formData.transfer_number.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setSavedMovementData({
        ...insertedData,
        customerName: formData.customer_name,
        customerAccountNumber: formData.customer_account_number,
      });
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error adding movement:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الحركة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReceipt = () => {
    setShowSuccessModal(false);
    router.push({
      pathname: '/receipt-preview',
      params: {
        movementId: savedMovementData.id,
        customerName: savedMovementData.customerName,
        customerAccountNumber: savedMovementData.customerAccountNumber,
      },
    });
  };

  const handleDownloadFromSuccess = async () => {
    if (!savedMovementData) return;

    setIsSavingPdf(true);
    try {
      const receiptData = {
        ...savedMovementData,
        customerName: savedMovementData.customerName,
        customerAccountNumber: savedMovementData.customerAccountNumber,
      };

      const qrData = generateQRCodeData(receiptData);
      const qrCodeDataUrl = await new Promise<string>((resolve) => {
        setTimeout(async () => {
          if (qrRef.current) {
            qrRef.current.toDataURL((dataUrl: string) => {
              resolve(`data:image/png;base64,${dataUrl}`);
            });
          } else {
            resolve('');
          }
        }, 100);
      });

      const logoDataUrl = await getLogoBase64();
      const html = generateReceiptHTML(receiptData, qrCodeDataUrl, logoDataUrl);

      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false,
      });

      const pdfName = `receipt_${savedMovementData.receipt_number || savedMovementData.movement_number}.pdf`;
      const pdfPath = `${FileSystem.documentDirectory}${pdfName}`;

      await FileSystem.moveAsync({
        from: uri,
        to: pdfPath,
      });

      Alert.alert('نجح', `تم حفظ الملف بنجاح:\n${pdfName}\n\nالمسار:\n${pdfPath}`);
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء حفظ الملف');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const selectCustomer = (customer: Customer) => {
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_account_number: customer.account_number,
      };

      if (prev.movement_type === 'outgoing') {
        newFormData.sender_name = customer.name;
        newFormData.beneficiary_name = 'علي هادي علي الرازحي';
      } else if (prev.movement_type === 'incoming') {
        newFormData.sender_name = 'علي هادي علي الرازحي';
        newFormData.beneficiary_name = customer.name;
      }

      return newFormData;
    });
    setShowCustomerPicker(false);
    setSearchQuery('');
  };

  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query) ||
      customer.account_number.toLowerCase().includes(query)
    );
  });

  const selectCurrency = (currency: Currency) => {
    setFormData({ ...formData, currency });
    setShowCurrencyPicker(false);
  };

  const selectCommissionCurrency = (currency: Currency) => {
    setFormData({ ...formData, commission_currency: currency });
    setShowCommissionCurrencyPicker(false);
  };

  const getCurrencySymbol = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    return currency?.symbol || code;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowRight size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>حركة مالية جديدة</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
        enabled
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
        <TouchableOpacity
          style={[
            styles.customerSelector,
            customerId && styles.customerSelectorSelected,
          ]}
          onPress={() => setShowCustomerPicker(true)}
        >
          <View style={styles.customerLabelRow}>
            <Text style={styles.customerLabel}>
              العميل <Text style={styles.required}>*</Text>
            </Text>
            {customerId && (
              <View style={styles.autoBadge}>
                <Text style={styles.autoBadgeText}>تم الاختيار تلقائياً</Text>
              </View>
            )}
          </View>
          <Text style={styles.customerValue}>
            {formData.customer_name || 'اختر عميل'}
          </Text>
          {formData.customer_account_number && (
            <Text style={styles.customerAccountText}>
              رقم الحساب: {formData.customer_account_number}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.movementTypeSection}>
          <Text style={styles.sectionTitle}>
            نوع الحركة <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.movementTypeButtons}>
            <TouchableOpacity
              style={[
                styles.movementTypeButton,
                formData.movement_type === 'outgoing' && styles.movementTypeButtonActive,
                { backgroundColor: formData.movement_type === 'outgoing' ? '#3B82F6' : '#F3F4F6' },
              ]}
              onPress={() => setFormData({ ...formData, movement_type: 'outgoing' })}
            >
              <ArrowDownCircle
                size={32}
                color={formData.movement_type === 'outgoing' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.movementTypeButtonText,
                  { color: formData.movement_type === 'outgoing' ? '#FFFFFF' : '#6B7280' },
                ]}
              >
                دفع
              </Text>
              <Text
                style={[
                  styles.movementTypeButtonSubtext,
                  { color: formData.movement_type === 'outgoing' ? '#DBEAFE' : '#9CA3AF' },
                ]}
              >
                العميل دفع لك
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.movementTypeButton,
                formData.movement_type === 'incoming' && styles.movementTypeButtonActive,
                { backgroundColor: formData.movement_type === 'incoming' ? '#F97316' : '#F3F4F6' },
              ]}
              onPress={() => setFormData({ ...formData, movement_type: 'incoming' })}
            >
              <ArrowUpCircle
                size={32}
                color={formData.movement_type === 'incoming' ? '#FFFFFF' : '#6B7280'}
              />
              <Text
                style={[
                  styles.movementTypeButtonText,
                  { color: formData.movement_type === 'incoming' ? '#FFFFFF' : '#6B7280' },
                ]}
              >
                إرسال
              </Text>
              <Text
                style={[
                  styles.movementTypeButtonSubtext,
                  { color: formData.movement_type === 'incoming' ? '#FFEDD5' : '#9CA3AF' },
                ]}
              >
                أنت أرسلت له
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.sectionTitle}>
            المبلغ <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.amountRow}>
            <TouchableOpacity
              style={styles.currencyButton}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <Text style={styles.currencyButtonText}>{formData.currency}</Text>
              <Text style={styles.currencySymbol}>{getCurrencySymbol(formData.currency)}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              textAlign="center"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>عمولة الحوالة (اختياري)</Text>
          <View style={styles.commissionRow}>
            <TouchableOpacity
              style={styles.commissionCurrencyButton}
              onPress={() => setShowCommissionCurrencyPicker(true)}
            >
              <Text style={styles.commissionCurrencyText}>{formData.commission_currency}</Text>
              <Text style={styles.commissionCurrencySymbol}>
                {getCurrencySymbol(formData.commission_currency)}
              </Text>
            </TouchableOpacity>
            <TextInput
              style={styles.commissionInput}
              value={formData.commission}
              onChangeText={(text) => setFormData({ ...formData, commission: text })}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
              textAlign="right"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>اسم المرسل</Text>
          <TextInput
            style={styles.input}
            value={formData.sender_name}
            onChangeText={(text) => setFormData({ ...formData, sender_name: text })}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            placeholder="اسم المرسل"
            placeholderTextColor="#9CA3AF"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>اسم المستفيد</Text>
          <TextInput
            style={styles.input}
            value={formData.beneficiary_name}
            onChangeText={(text) => setFormData({ ...formData, beneficiary_name: text })}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            placeholder="اسم المستفيد (اختياري)"
            placeholderTextColor="#9CA3AF"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>رقم الحوالة</Text>
          <TextInput
            style={styles.input}
            value={formData.transfer_number}
            onChangeText={(text) => setFormData({ ...formData, transfer_number: text })}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            placeholder="رقم الحوالة (اختياري)"
            placeholderTextColor="#9CA3AF"
            textAlign="right"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ملاحظات</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
            placeholder="أدخل ملاحظات إضافية"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlign="right"
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.submitButtonText}>
            {isLoading ? 'جاري الحفظ...' : 'حفظ الحركة'}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCustomerPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowCustomerPicker(false);
          setSearchQuery('');
        }}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => {
            setShowCustomerPicker(false);
            setSearchQuery('');
            Keyboard.dismiss();
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
          >
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>اختر عميل</Text>

                <View style={styles.searchContainer}>
                  <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="ابحث بالاسم، الهاتف، أو رقم الحساب"
                    placeholderTextColor="#9CA3AF"
                    textAlign="right"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setSearchQuery('')}
                      style={styles.clearSearchButton}
                    >
                      <X size={18} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <TouchableOpacity
                        key={customer.id}
                        style={styles.modalItem}
                        onPress={() => selectCustomer(customer)}
                      >
                        <Text style={styles.modalItemText}>{customer.name}</Text>
                        <View style={styles.modalItemInfo}>
                          <Text style={styles.modalItemSubtext}>{customer.phone}</Text>
                          <Text style={[styles.modalItemSubtext, { color: '#4F46E5', fontWeight: '600' }]}>
                            رقم الحساب: {customer.account_number}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptySearchResult}>
                      <Text style={styles.emptySearchText}>لا توجد نتائج مطابقة</Text>
                      <Text style={styles.emptySearchSubtext}>جرب البحث بكلمات أخرى</Text>
                    </View>
                  )}
                </ScrollView>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowCustomerPicker(false);
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.modalCloseButtonText}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اختر عملة</Text>
            <ScrollView style={styles.modalList}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={styles.modalItem}
                  onPress={() => selectCurrency(currency.code)}
                >
                  <Text style={styles.modalItemText}>
                    {currency.code} - {currency.name}
                  </Text>
                  <Text style={styles.modalItemSubtext}>{currency.symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCurrencyPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCommissionCurrencyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommissionCurrencyPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اختر عملة العمولة</Text>
            <ScrollView style={styles.modalList}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={styles.modalItem}
                  onPress={() => selectCommissionCurrency(currency.code)}
                >
                  <Text style={styles.modalItemText}>
                    {currency.code} - {currency.name}
                  </Text>
                  <Text style={styles.modalItemSubtext}>{currency.symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCommissionCurrencyPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseSuccessModal}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconContainer}>
              <CheckCircle size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>تم الحفظ بنجاح</Text>
            <Text style={styles.successSubtitle}>تم إضافة الحركة المالية إلى النظام</Text>

            <View style={styles.successButtonsContainer}>
              <TouchableOpacity
                style={styles.openReceiptButton}
                onPress={handleOpenReceipt}
              >
                <FileText size={20} color="#FFFFFF" />
                <Text style={styles.openReceiptButtonText}>فتح السند</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isSavingPdf && styles.saveButtonDisabled]}
                onPress={handleDownloadFromSuccess}
                disabled={isSavingPdf}
              >
                {isSavingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Download size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>حفظ في الجهاز</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={handleCloseSuccessModal}
              >
                <X size={20} color="#6B7280" />
                <Text style={styles.closeModalButtonText}>إغلاق</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.hidden}>
        {savedMovementData && (
          <QRCode
            value={generateQRCodeData(savedMovementData)}
            size={120}
            getRef={(ref) => (qrRef.current = ref)}
          />
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 150,
  },
  customerSelector: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  customerSelectorSelected: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  customerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
  },
  customerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  customerAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginTop: 6,
    textAlign: 'right',
  },
  autoBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  required: {
    color: '#EF4444',
  },
  movementTypeSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'right',
  },
  movementTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  movementTypeButton: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  movementTypeButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  movementTypeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
  },
  movementTypeButtonSubtext: {
    fontSize: 14,
  },
  amountSection: {
    marginBottom: 20,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
  },
  currencyButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    padding: 16,
    width: 100,
    alignItems: 'center',
  },
  currencyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  currencySymbol: {
    fontSize: 14,
    color: '#E0E7FF',
  },
  amountInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  commissionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  commissionCurrencyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionCurrencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  commissionCurrencySymbol: {
    fontSize: 12,
    color: '#D1FAE5',
  },
  commissionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    paddingTop: 14,
  },
  submitButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalList: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'right',
  },
  modalItemInfo: {
    gap: 4,
  },
  modalItemSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  modalCloseButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  clearSearchButton: {
    padding: 4,
    marginRight: 4,
  },
  emptySearchResult: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySearchText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySearchSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  successModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    textAlign: 'center',
  },
  successButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  openReceiptButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  openReceiptButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  saveButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeModalButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  closeModalButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  hidden: {
    position: 'absolute',
    left: -1000,
    top: -1000,
    opacity: 0,
  },
});
