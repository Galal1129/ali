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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowRight, Save, ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Customer, Currency, CURRENCIES } from '@/types/database';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

export default function NewMovementScreen() {
  const router = useRouter();
  const { customerId, customerName } = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCommissionCurrencyPicker, setShowCommissionCurrencyPicker] = useState(false);

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
    sender_name: 'علي هادي علي الرازحي',
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
        beneficiary_name: customerName as string,
      }));
    }
  }, [customerId, customerName]);

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

      Alert.alert('نجح', 'تم إضافة الحركة بنجاح', [
        {
          text: 'عرض السند',
          onPress: () => {
            router.push({
              pathname: '/receipt-preview',
              params: {
                movementId: insertedData.id,
                customerName: formData.customer_name,
                customerAccountNumber: formData.customer_account_number,
              },
            });
          },
        },
        {
          text: 'إغلاق',
          onPress: () => router.back(),
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error adding movement:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إضافة الحركة');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setFormData({
      ...formData,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_account_number: customer.account_number,
      beneficiary_name: customer.name,
    });
    setShowCustomerPicker(false);
  };

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
                { backgroundColor: formData.movement_type === 'outgoing' ? '#10B981' : '#F3F4F6' },
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
                  { color: formData.movement_type === 'outgoing' ? '#D1FAE5' : '#9CA3AF' },
                ]}
              >
                العميل دفع لك
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.movementTypeButton,
                formData.movement_type === 'incoming' && styles.movementTypeButtonActive,
                { backgroundColor: formData.movement_type === 'incoming' ? '#EF4444' : '#F3F4F6' },
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
                  { color: formData.movement_type === 'incoming' ? '#FEE2E2' : '#9CA3AF' },
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
        onRequestClose={() => setShowCustomerPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>اختر عميل</Text>
            <ScrollView style={styles.modalList}>
              {customers.map((customer) => (
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
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCustomerPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
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
});
