import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Phone,
  MessageCircle,
  Settings,
  Plus,
  Receipt,
  BarChart3,
  Calculator,
  FileText,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Customer, AccountMovement, CURRENCIES } from '@/types/database';
import { format, isSameMonth, isSameYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { generateAccountStatementHTML } from '@/utils/accountStatementGenerator';

interface GroupedMovements {
  [key: string]: AccountMovement[];
}

interface CurrencyBalance {
  currency: string;
  incoming: number;
  outgoing: number;
  balance: number;
}

function groupMovementsByMonth(movements: AccountMovement[]): GroupedMovements {
  const grouped: GroupedMovements = {};

  movements.forEach((movement) => {
    const date = new Date(movement.created_at);
    const key = format(date, 'MMMM yyyy', { locale: ar });

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(movement);
  });

  return grouped;
}

function getCurrencySymbol(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.symbol || code;
}

function getCurrencyName(code: string): string {
  const currency = CURRENCIES.find((c) => c.code === code);
  return currency?.name || code;
}

interface CurrencyTotals {
  currency: string;
  incoming: number;
  outgoing: number;
}

function calculateCurrencyTotals(movements: AccountMovement[]): CurrencyTotals[] {
  const currencyMap: { [key: string]: CurrencyTotals } = {};

  movements.forEach((movement) => {
    const currency = movement.currency;
    if (!currencyMap[currency]) {
      currencyMap[currency] = {
        currency,
        incoming: 0,
        outgoing: 0,
      };
    }

    const amount = Number(movement.amount);
    if (movement.movement_type === 'incoming') {
      currencyMap[currency].incoming += amount;
    } else {
      currencyMap[currency].outgoing += amount;
    }
  });

  return Object.values(currencyMap);
}

function calculateBalanceByCurrency(movements: AccountMovement[]): CurrencyBalance[] {
  const currencyMap: { [key: string]: CurrencyBalance } = {};

  movements.forEach((movement) => {
    const currency = movement.currency;
    if (!currencyMap[currency]) {
      currencyMap[currency] = {
        currency,
        incoming: 0,
        outgoing: 0,
        balance: 0,
      };
    }

    const amount = Number(movement.amount);
    if (movement.movement_type === 'incoming') {
      currencyMap[currency].incoming += amount;
    } else {
      currencyMap[currency].outgoing += amount;
    }

    if (movement.commission && Number(movement.commission) > 0) {
      const commissionCurrency = (movement as any).commission_currency || 'YER';

      if (!currencyMap[commissionCurrency]) {
        currencyMap[commissionCurrency] = {
          currency: commissionCurrency,
          incoming: 0,
          outgoing: 0,
          balance: 0,
        };
      }

      currencyMap[commissionCurrency].outgoing += Number(movement.commission);
    }
  });

  Object.values(currencyMap).forEach((item) => {
    // الرصيد = التسليم - الاستلام
    // رصيد موجب = "لنا عندك"، رصيد سالب = "لك عندنا"
    item.balance = item.incoming - item.outgoing;
  });

  return Object.values(currencyMap).filter((item) => item.balance !== 0);
}

export default function CustomerDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<AccountMovement[]>([]);
  const [totalIncoming, setTotalIncoming] = useState(0);
  const [totalOutgoing, setTotalOutgoing] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadCustomerData = useCallback(async () => {
    try {
      const [customerResult, movementsResult] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('account_movements')
          .select('*')
          .eq('customer_id', id)
          .order('created_at', { ascending: false }),
      ]);

      if (customerResult.error || !customerResult.data) {
        Alert.alert('خطأ', 'لم يتم العثور على العميل');
        router.back();
        return;
      }

      setCustomer(customerResult.data);
      setMovements(movementsResult.data || []);

      const incoming = movementsResult.data
        ?.filter((m) => m.movement_type === 'incoming')
        .reduce((sum, m) => sum + Number(m.amount), 0) || 0;

      const outgoing = movementsResult.data
        ?.filter((m) => m.movement_type === 'outgoing')
        .reduce((sum, m) => sum + Number(m.amount), 0) || 0;

      setTotalIncoming(incoming);
      setTotalOutgoing(outgoing);
    } catch (error) {
      console.error('Error loading customer data:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        setIsLoading(true);
        loadCustomerData();
      }
    }, [id, loadCustomerData])
  );

  const handleCall = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const handleWhatsApp = () => {
    if (customer?.phone) {
      const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
      const balances = calculateBalanceByCurrency(movements);
      const currentDate = format(new Date(), 'EEEE، dd MMMM yyyy', { locale: ar });

      let message = `مرحباً ${customer.name}،\n`;
      message += `رقم الحساب: ${customer.account_number}\n`;
      message += `التاريخ: ${currentDate}\n\n`;

      if (balances.length === 0) {
        message += `رصيدك الحالي: متساوي`;
      } else {
        message += `رصيدك الحالي:\n`;
        balances.forEach((currBalance) => {
          const symbol = getCurrencySymbol(currBalance.currency);
          if (currBalance.balance > 0) {
            message += `• لنا عندك ${Math.round(currBalance.balance)} ${symbol}\n`;
          } else {
            message += `• لك عندنا ${Math.round(Math.abs(currBalance.balance))} ${symbol}\n`;
          }
        });
      }

      message += `\nشكراً`;

      const encodedMessage = encodeURIComponent(message);
      Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${encodedMessage}`);
    } else {
      Alert.alert('تنبيه', 'لا يوجد رقم هاتف مسجل لهذا العميل');
    }
  };

  const handlePrint = async () => {
    if (!customer || movements.length === 0) {
      Alert.alert('تنبيه', 'لا توجد حركات لطباعتها');
      return;
    }

    setIsPrinting(true);

    try {
      const html = generateAccountStatementHTML(customer.name, movements);
      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `كشف حساب ${customer.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('نجح', 'تم إنشاء كشف الحساب بنجاح');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء إنشاء كشف الحساب');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSettleUp = () => {
    Alert.alert('تسوية الحساب', 'ميزة تسوية الحساب قيد التطوير');
  };

  const handleResetAccount = () => {
    if (!customer) return;

    Alert.alert(
      'تصفير الحساب',
      `هل أنت متأكد من تصفير حساب ${customer.name}?\n\nسيتم حذف جميع الحركات (${movements.length} حركة) مع الاحتفاظ ببيانات العميل.\n\nلا يمكن التراجع عن هذه العملية!`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تصفير',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('reset_customer_account', {
                p_customer_id: id,
              });

              if (error) {
                Alert.alert('خطأ', 'حدث خطأ أثناء تصفير الحساب');
                console.error('Error resetting account:', error);
                return;
              }

              const result = data as { success: boolean; message: string; movements_deleted: number };

              if (result.success) {
                Alert.alert('نجح', `تم تصفير الحساب بنجاح\nتم حذف ${result.movements_deleted} حركة`, [
                  {
                    text: 'حسناً',
                    onPress: () => {
                      loadCustomerData();
                    },
                  },
                ]);
              } else {
                Alert.alert('خطأ', result.message);
              }
            } catch (error) {
              console.error('Error resetting account:', error);
              Alert.alert('خطأ', 'حدث خطأ غير متوقع');
            }
          },
        },
      ]
    );
  };

  const handleDeleteCustomer = () => {
    if (!customer) return;

    const balances = calculateBalanceByCurrency(movements);
    const hasBalance = balances.length > 0 && balances.some((b) => b.balance !== 0);

    let warningMessage = `هل أنت متأكد من حذف ${customer.name} نهائياً؟\n\n`;

    if (hasBalance) {
      warningMessage += 'تحذير: العميل لديه رصيد غير صفري!\n';
      balances.forEach((currBalance) => {
        const symbol = getCurrencySymbol(currBalance.currency);
        if (currBalance.balance > 0) {
          warningMessage += `• لنا عنده ${Math.round(currBalance.balance)} ${symbol}\n`;
        } else {
          warningMessage += `• له عندنا ${Math.round(Math.abs(currBalance.balance))} ${symbol}\n`;
        }
      });
      warningMessage += '\n';
    }

    warningMessage += `سيتم حذف:\n`;
    warningMessage += `• جميع بيانات العميل\n`;
    warningMessage += `• جميع الحركات (${movements.length} حركة)\n\n`;
    warningMessage += `لا يمكن التراجع عن هذه العملية!`;

    Alert.alert('حذف العميل', warningMessage, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'تأكيد نهائي',
            'هل أنت متأكد تماماً من حذف هذا العميل؟',
            [
              { text: 'إلغاء', style: 'cancel' },
              {
                text: 'نعم، احذف',
                style: 'destructive',
                onPress: async () => {
                  try {
                    const { data, error } = await supabase.rpc('delete_customer_completely', {
                      p_customer_id: id,
                    });

                    if (error) {
                      Alert.alert('خطأ', 'حدث خطأ أثناء حذف العميل');
                      console.error('Error deleting customer:', error);
                      return;
                    }

                    const result = data as { success: boolean; message: string; movements_deleted: number };

                    if (result.success) {
                      Alert.alert('تم الحذف', `تم حذف العميل بنجاح\nتم حذف ${result.movements_deleted} حركة`, [
                        {
                          text: 'حسناً',
                          onPress: () => router.back(),
                        },
                      ]);
                    } else {
                      Alert.alert('خطأ', result.message);
                    }
                  } catch (error) {
                    console.error('Error deleting customer:', error);
                    Alert.alert('خطأ', 'حدث خطأ غير متوقع');
                  }
                },
              },
            ]
          );
        },
      },
    ]);
  };

  const handleShareAccount = async () => {
    if (!customer) return;

    const balances = calculateBalanceByCurrency(movements);
    let accountText = `تقرير حساب العميل: ${customer.name}\n`;
    accountText += `=====================================\n\n`;

    if (balances.length === 0) {
      accountText += `الحالة: الحساب متساوي\n\n`;
    } else {
      accountText += `الأرصدة:\n`;
      balances.forEach((currBalance) => {
        const symbol = getCurrencySymbol(currBalance.currency);
        if (currBalance.balance > 0) {
          accountText += `• لنا عند العميل: ${Math.round(currBalance.balance)} ${symbol}\n`;
        } else {
          accountText += `• للعميل عندنا: ${Math.round(Math.abs(currBalance.balance))} ${symbol}\n`;
        }
      });
      accountText += `\n`;
    }

    if (movements.length > 0) {
      accountText += `تفاصيل الحركات:\n`;
      accountText += `=====================================\n\n`;

      const grouped = groupMovementsByMonth(movements);
      Object.entries(grouped).forEach(([monthYear, monthMovements]) => {
        accountText += `${monthYear}\n`;
        accountText += `-------------------------------------\n`;
        monthMovements.forEach((movement) => {
          const date = format(new Date(movement.created_at), 'dd/MM/yyyy', { locale: ar });
          const type = movement.movement_type === 'outgoing' ? 'استلام من العميل' : 'تسليم للعميل';
          const symbol = getCurrencySymbol(movement.currency);
          accountText += `${date} - ${type} ${movement.movement_number}\n`;
          accountText += `المبلغ: ${Math.round(Number(movement.amount))} ${symbol}\n`;
          if (movement.notes) {
            accountText += `الملاحظات: ${movement.notes}\n`;
          }
          accountText += `\n`;
        });
        accountText += `\n`;
      });
    }

    accountText += `\nتم إنشاء التقرير بتاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ar })}\n`;

    try {
      await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(accountText)}`);
    } catch (error) {
      Alert.alert('مشاركة الحساب', accountText, [
        { text: 'إغلاق', style: 'cancel' },
      ]);
    }
  };

  const handleAddMovement = () => {
    router.push({
      pathname: '/new-movement',
      params: { customerId: id, customerName: customer?.name },
    });
  };

  const balance = customer?.balance || 0;
  const groupedMovements = groupMovementsByMonth(movements);
  const currencyBalances = calculateBalanceByCurrency(movements);
  const currencyTotals = calculateCurrencyTotals(movements);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={styles.gradientHeader}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ArrowRight size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>تفاصيل العميل</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>جاري التحميل...</Text>
        </View>
      </View>
    );
  }

  if (!customer) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowRight size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{customer.name}</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() =>
              Alert.alert('إدارة العميل', `اختر العملية المطلوبة لـ ${customer.name}:`, [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'تعديل البيانات', onPress: () => Alert.alert('قيد التطوير') },
                { text: 'واتساب', onPress: handleWhatsApp },
                { text: 'اتصال', onPress: handleCall },
                {
                  text: 'تصفير الحساب',
                  onPress: handleResetAccount,
                  style: 'destructive'
                },
                {
                  text: 'حذف العميل',
                  onPress: handleDeleteCustomer,
                  style: 'destructive'
                },
              ])
            }
          >
            <Settings size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerInfo}>
          <View style={styles.headerBadge}>
            <Receipt size={14} color="#FFFFFF" />
            <Text style={styles.headerBadgeText}>{movements.length} حركة</Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>رقم الحساب: {customer.account_number}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.summarySection}>
          {currencyBalances.length === 0 ? (
            <Text style={styles.summaryMainText}>الحساب متساوي</Text>
          ) : (
            currencyBalances.map((currBalance) => (
              <View key={currBalance.currency} style={styles.currencyBalanceContainer}>
                {currBalance.balance > 0 ? (
                  <Text style={styles.summaryLineGreen}>
                    لنا عند {customer.name}{' '}
                    <Text style={styles.summaryAmountGreen}>
                      {Math.round(currBalance.balance)} {getCurrencySymbol(currBalance.currency)}
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.summaryLineRed}>
                    {customer.name} له عندنا{' '}
                    <Text style={styles.summaryAmountRed}>
                      {Math.round(Math.abs(currBalance.balance))} {getCurrencySymbol(currBalance.currency)}
                    </Text>
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {currencyTotals.length > 0 && (
          <View style={styles.currencyDetailsSection}>
            <Text style={styles.currencyDetailsTitle}>ملخص الحركات</Text>
            {currencyTotals.map((total) => (
              <View key={total.currency} style={styles.currencyDetailsCard}>
                <Text style={styles.currencyDetailsName}>{getCurrencyName(total.currency)}:</Text>
                <View style={styles.currencyDetailsRow}>
                  <Text style={styles.currencyDetailsLabel}>وارد:</Text>
                  <Text style={styles.currencyDetailsValue}>
                    {total.incoming.toFixed(2)} {getCurrencySymbol(total.currency)}
                  </Text>
                </View>
                <View style={styles.currencyDetailsRow}>
                  <Text style={styles.currencyDetailsLabel}>صادر:</Text>
                  <Text style={styles.currencyDetailsValue}>
                    {total.outgoing.toFixed(2)} {getCurrencySymbol(total.currency)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.tabButtons}>
          <TouchableOpacity style={styles.tabButtonPrimary} onPress={handleShareAccount}>
            <Text style={styles.tabButtonPrimaryText}>مشاركة الحساب</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, isPrinting && styles.tabButtonDisabled]}
            onPress={handlePrint}
            disabled={isPrinting || movements.length === 0}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#6B7280" />
            ) : (
              <FileText size={16} color="#6B7280" />
            )}
            <Text style={styles.tabButtonText}>طباعة PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={handleCall}>
            <Phone size={16} color="#6B7280" />
            <Text style={styles.tabButtonText}>اتصال</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tabButton} onPress={handleWhatsApp}>
            <MessageCircle size={16} color="#6B7280" />
            <Text style={styles.tabButtonText}>واتساب</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.movementsSection}>
          {movements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>لا توجد حركات</Text>
            </View>
          ) : (
            Object.entries(groupedMovements).map(([monthYear, monthMovements]) => (
              <View key={monthYear}>
                <Text style={styles.monthHeader}>{monthYear}</Text>
                {monthMovements.map((movement) => (
                  <TouchableOpacity
                    key={movement.id}
                    style={styles.movementRow}
                    activeOpacity={0.7}
                    onPress={() => router.push({
                      pathname: '/movement-details',
                      params: { movementId: movement.id }
                    })}
                  >
                    <View style={styles.movementDate}>
                      <Text style={styles.movementDateMonth}>
                        {format(new Date(movement.created_at), 'MMM', { locale: ar })}
                      </Text>
                      <Text style={styles.movementDateDay}>
                        {format(new Date(movement.created_at), 'dd')}
                      </Text>
                    </View>

                    <View style={styles.movementNumberContainer}>
                      <Text style={styles.movementNumber}>{movement.movement_number}</Text>
                    </View>

                    <View style={styles.movementTypeContainer}>
                      <Text
                        style={[
                          styles.movementType,
                          {
                            color: movement.movement_type === 'outgoing' ? '#10B981' : '#3B82F6',
                          },
                        ]}
                      >
                        {movement.movement_type === 'outgoing' ? 'استلام' : 'تسليم'}
                      </Text>
                      {movement.notes && (
                        <Text style={styles.movementNotes} numberOfLines={1}>
                          {movement.notes}
                        </Text>
                      )}
                    </View>

                    <View style={styles.spacer} />

                    <View
                      style={[
                        styles.movementIcon,
                        {
                          backgroundColor:
                            movement.movement_type === 'outgoing' ? '#ECFDF5' : '#EFF6FF',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.currencySymbolText,
                          {
                            color: movement.movement_type === 'outgoing' ? '#10B981' : '#3B82F6',
                          },
                        ]}
                      >
                        {getCurrencySymbol(movement.currency)}
                      </Text>
                    </View>

                    <View style={styles.movementAmount}>
                      <Text
                        style={[
                          styles.movementAmountText,
                          {
                            color: movement.movement_type === 'outgoing' ? '#10B981' : '#3B82F6',
                          },
                        ]}
                      >
                        {Math.round(Number(movement.amount))}
                      </Text>
                      <Text style={styles.movementLabel}>
                        {movement.movement_type === 'outgoing' ? 'من العميل' : 'للعميل'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddMovement}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  gradientHeader: {
    paddingTop: 56,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerInfo: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  summaryMainText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 24,
    textAlign: 'right',
  },
  summaryMainAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryLineGreen: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 22,
    textAlign: 'right',
  },
  summaryAmountGreen: {
    fontWeight: '700',
    color: '#10B981',
  },
  summaryLineRed: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 22,
    textAlign: 'right',
  },
  summaryAmountRed: {
    fontWeight: '700',
    color: '#EF4444',
  },
  currencyBalanceContainer: {
    marginBottom: 8,
  },
  currencyDetailsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  currencyDetailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'right',
  },
  currencyDetailsCard: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  currencyDetailsName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'right',
  },
  currencyDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyDetailsLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  currencyDetailsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'left',
  },
  tabButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
  },
  tabButtonPrimary: {
    backgroundColor: '#F97316',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minWidth: 140,
  },
  tabButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minWidth: 100,
  },
  tabButtonDisabled: {
    opacity: 0.5,
  },
  tabButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  movementsSection: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
    paddingBottom: 100,
  },
  monthHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    textAlign: 'right',
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  movementDate: {
    alignItems: 'center',
    width: 50,
  },
  movementDateMonth: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  movementDateDay: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  movementNumberContainer: {
    justifyContent: 'center',
    marginLeft: 12,
    width: 60,
  },
  movementNumber: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  movementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 0,
    marginRight: 2,
  },
  currencySymbolText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  movementTypeContainer: {
    justifyContent: 'center',
    marginLeft: 4,
    maxWidth: 60,
  },
  movementType: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  movementNotes: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  spacer: {
    flex: 1,
  },
  movementAmount: {
    alignItems: 'flex-end',
    width: 70,
    marginLeft: 2,
  },
  movementAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  movementLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
