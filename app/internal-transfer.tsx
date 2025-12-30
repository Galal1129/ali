import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { ArrowLeftRight, ArrowLeft, AlertCircle, Plus, X, Printer, Save } from 'lucide-react-native';
import PartySelector from '@/components/PartySelector';
import { supabase } from '@/lib/supabase';
import { Currency, CURRENCIES } from '@/types/database';

interface TransferFormData {
  fromType: 'shop' | 'customer' | null;
  fromCustomerId?: string;
  fromCustomerName?: string;
  fromCustomerAccount?: string;
  toType: 'shop' | 'customer' | null;
  toCustomerId?: string;
  toCustomerName?: string;
  toCustomerAccount?: string;
  amount: string;
  currency: Currency;
  notes: string;
  commission: string;
  commissionCurrency: Currency;
}

export default function InternalTransferScreen() {
  const [formData, setFormData] = useState<TransferFormData>({
    fromType: null,
    toType: null,
    amount: '',
    currency: 'USD',
    notes: '',
    commission: '',
    commissionCurrency: 'YER',
  });
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showCommission, setShowCommission] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCommissionCurrencyPicker, setShowCommissionCurrencyPicker] = useState(false);

  const validateTransfer = (): string | null => {
    if (!formData.fromType) {
      return 'يرجى اختيار الطرف المُحوِّل';
    }

    if (!formData.toType) {
      return 'يرجى اختيار الطرف المُحوَّل إليه';
    }

    if (
      formData.fromType === 'shop' &&
      formData.toType === 'shop'
    ) {
      return 'لا يمكن التحويل من المحل إلى المحل';
    }

    if (
      formData.fromType === 'customer' &&
      formData.toType === 'customer' &&
      formData.fromCustomerId === formData.toCustomerId
    ) {
      return 'لا يمكن التحويل لنفس العميل';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return 'يرجى إدخال مبلغ صحيح';
    }

    if (formData.commission && parseFloat(formData.commission) < 0) {
      return 'العمولة يجب أن تكون صفر أو أكبر';
    }

    return null;
  };

  const handleSubmit = async (withPrint: boolean = false) => {
    const error = validateTransfer();
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setLoading(true);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'create_internal_transfer',
        {
          p_from_customer_id: formData.fromType === 'customer' ? formData.fromCustomerId : null,
          p_to_customer_id: formData.toType === 'customer' ? formData.toCustomerId : null,
          p_amount: parseFloat(formData.amount),
          p_currency: formData.currency,
          p_notes: formData.notes || null,
          p_commission: formData.commission && parseFloat(formData.commission) > 0 ? parseFloat(formData.commission) : null,
          p_commission_currency: formData.commission && parseFloat(formData.commission) > 0 ? formData.commissionCurrency : null,
        }
      );

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          const movementId = result.to_movement_id || result.from_movement_id;

          if (withPrint && movementId) {
            const customerName = formData.toType === 'customer' ? formData.toCustomerName : formData.fromCustomerName;
            const customerAccountNumber = formData.toType === 'customer' ? formData.toCustomerAccount : formData.fromCustomerAccount;

            router.push({
              pathname: '/receipt-preview',
              params: {
                movementId: movementId,
                customerName: customerName,
                customerAccountNumber: customerAccountNumber || '000000',
              },
            });
          } else {
            Alert.alert(
              'نجح التحويل',
              result.message,
              [
                {
                  text: 'حسناً',
                  onPress: () => router.back(),
                },
              ]
            );
          }
        } else {
          Alert.alert('خطأ', result.message);
        }
      }
    } catch (error: any) {
      console.error('Error creating transfer:', error);
      Alert.alert('خطأ', error.message || 'حدث خطأ أثناء التحويل');
    } finally {
      setLoading(false);
    }
  };

  const getTransferSummary = () => {
    const fromLabel = formData.fromType === 'shop'
      ? 'المحل'
      : formData.fromCustomerName || 'عميل';

    const toLabel = formData.toType === 'shop'
      ? 'المحل'
      : formData.toCustomerName || 'عميل';

    return `من ${fromLabel} إلى ${toLabel}`;
  };

  const getBalanceImpact = () => {
    if (!formData.fromType || !formData.toType || !formData.amount) {
      return null;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return null;

    const currencySymbol = CURRENCIES.find(c => c.code === formData.currency)?.symbol || '';

    if (formData.fromType === 'customer' && formData.toType === 'customer') {
      return {
        from: `${formData.fromCustomerName}: سيزيد رصيده بمقدار +${amount} ${currencySymbol}`,
        to: `${formData.toCustomerName}: سينخفض رصيده بمقدار -${amount} ${currencySymbol}`,
        note: 'تحويل داخلي - لا يؤثر على رصيد المحل',
      };
    } else if (formData.fromType === 'shop') {
      return {
        to: `${formData.toCustomerName}: سيزيد رصيده بمقدار +${amount} ${currencySymbol}`,
        note: 'تسليم من المحل للعميل',
      };
    } else if (formData.toType === 'shop') {
      return {
        from: `${formData.fromCustomerName}: سينخفض رصيده بمقدار -${amount} ${currencySymbol}`,
        note: 'استلام من العميل للمحل',
      };
    }

    return null;
  };

  const balanceImpact = getBalanceImpact();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'تحويل داخلي',
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#1F2937" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ArrowLeftRight size={32} color="#3B82F6" />
          </View>
          <Text style={styles.headerTitle}>تحويل داخلي</Text>
          <Text style={styles.headerSubtitle}>
            قم بتحويل الأموال بين العملاء أو بين العميل والمحل
          </Text>
        </View>

        {validationError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#EF4444" />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <PartySelector
            label="من (المُحوِّل)"
            selectedType={formData.fromType}
            selectedCustomerId={formData.fromCustomerId}
            selectedCustomerName={formData.fromCustomerName}
            onSelect={(type, customerId, customerName, accountNumber) => {
              setFormData({
                ...formData,
                fromType: type,
                fromCustomerId: customerId,
                fromCustomerName: customerName,
                fromCustomerAccount: accountNumber,
              });
              setValidationError(null);
            }}
            excludeCustomerId={formData.toCustomerId}
          />

          <View style={styles.arrowContainer}>
            <View style={styles.arrowLine} />
            <View style={styles.arrowCircle}>
              <ArrowLeftRight size={20} color="#3B82F6" />
            </View>
            <View style={styles.arrowLine} />
          </View>

          <PartySelector
            label="إلى (المُحوَّل إليه)"
            selectedType={formData.toType}
            selectedCustomerId={formData.toCustomerId}
            selectedCustomerName={formData.toCustomerName}
            onSelect={(type, customerId, customerName, accountNumber) => {
              setFormData({
                ...formData,
                toType: type,
                toCustomerId: customerId,
                toCustomerName: customerName,
                toCustomerAccount: accountNumber,
              });
              setValidationError(null);
            }}
            excludeCustomerId={formData.fromCustomerId}
          />

          <View style={styles.amountSection}>
            <Text style={styles.label}>المبلغ</Text>
            <View style={styles.amountInputContainer}>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={formData.amount}
                onChangeText={(text) => {
                  setFormData({ ...formData, amount: text });
                  setValidationError(null);
                }}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.label}>العملة</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.currencyScroll}
            >
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={[
                    styles.currencyButton,
                    formData.currency === curr.code && styles.currencyButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, currency: curr.code })}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      formData.currency === curr.code && styles.currencyButtonTextActive,
                    ]}
                  >
                    {curr.symbol} {curr.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {!showCommission ? (
            <TouchableOpacity
              style={styles.addCommissionButton}
              onPress={() => setShowCommission(true)}
            >
              <Plus size={16} color="#3B82F6" />
              <Text style={styles.addCommissionText}>إضافة عمولة</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.commissionSection}>
              <View style={styles.commissionHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setShowCommission(false);
                    setFormData({ ...formData, commission: '' });
                  }}
                >
                  <X size={20} color="#EF4444" />
                </TouchableOpacity>
                <Text style={styles.label}>عمولة (اختياري)</Text>
              </View>
              <View style={styles.commissionRow}>
                <TouchableOpacity
                  style={styles.commissionCurrencyButton}
                  onPress={() => setShowCommissionCurrencyPicker(true)}
                >
                  <Text style={styles.commissionCurrencyText}>{formData.commissionCurrency}</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.commissionInput}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={formData.commission}
                  onChangeText={(text) => {
                    setFormData({ ...formData, commission: text });
                    setValidationError(null);
                  }}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          )}

          <View style={styles.notesSection}>
            <Text style={styles.label}>ملاحظات (اختياري)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="أضف ملاحظة..."
              multiline
              numberOfLines={3}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholderTextColor="#9CA3AF"
              textAlign="right"
            />
          </View>

          {balanceImpact && (
            <View style={styles.impactContainer}>
              <Text style={styles.impactTitle}>تأثير التحويل:</Text>
              {balanceImpact.from && (
                <Text style={styles.impactText}>{balanceImpact.from}</Text>
              )}
              {balanceImpact.to && (
                <Text style={styles.impactText}>{balanceImpact.to}</Text>
              )}
              {balanceImpact.note && (
                <Text style={styles.impactNote}>{balanceImpact.note}</Text>
              )}
            </View>
          )}

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={() => handleSubmit(false)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Save size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>حفظ فقط</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.printButton, loading && styles.submitButtonDisabled]}
              onPress={() => handleSubmit(true)}
              disabled={loading}
            >
              <Printer size={18} color="#3B82F6" />
              <Text style={styles.printButtonText}>حفظ + طباعة</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showCommissionCurrencyPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCommissionCurrencyPicker(false)}
      >
        <View style={styles.pickerContainer}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>اختر عملة العمولة</Text>
            <ScrollView style={styles.pickerList}>
              {CURRENCIES.map((curr) => (
                <TouchableOpacity
                  key={curr.code}
                  style={styles.pickerItem}
                  onPress={() => {
                    setFormData({ ...formData, commissionCurrency: curr.code });
                    setShowCommissionCurrencyPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>
                    {curr.code} - {curr.name}
                  </Text>
                  <Text style={styles.pickerItemSymbol}>{curr.symbol}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseButton}
              onPress={() => setShowCommissionCurrencyPicker(false)}
            >
              <Text style={styles.pickerCloseButtonText}>إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'right',
  },
  form: {
    padding: 20,
  },
  arrowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  arrowLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  amountSection: {
    marginTop: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'right',
  },
  amountInputContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    padding: 16,
    textAlign: 'center',
  },
  currencyScroll: {
    marginBottom: 20,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  currencyButtonActive: {
    backgroundColor: '#3B82F6',
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  currencyButtonTextActive: {
    color: '#FFFFFF',
  },
  notesSection: {
    marginBottom: 20,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  impactContainer: {
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: 20,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
    marginBottom: 8,
    textAlign: 'right',
  },
  impactText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 4,
    textAlign: 'right',
  },
  impactNote: {
    fontSize: 12,
    color: '#A16207',
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  addCommissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginBottom: 16,
  },
  addCommissionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3B82F6',
  },
  commissionSection: {
    marginBottom: 20,
  },
  commissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  commissionCurrencyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionCurrencyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  commissionInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  buttonsContainer: {
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  printButton: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerList: {
    flexGrow: 0,
    flexShrink: 1,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 15,
    color: '#111827',
    textAlign: 'right',
  },
  pickerItemSymbol: {
    fontSize: 14,
    color: '#6B7280',
  },
  pickerCloseButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  pickerCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
});
