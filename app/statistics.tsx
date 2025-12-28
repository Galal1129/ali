import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  I18nManager,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, TrendingUp, Users, DollarSign, AlertCircle, Calendar, TrendingDown, Coins } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TotalBalanceByCurrency, CURRENCIES } from '@/types/database';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

interface Stats {
  totalCustomers: number;
  totalTransactions: number;
  totalAmount: number;
  totalDebts: number;
  todayTransactions: number;
  todayAmount: number;
  weekTransactions: number;
  weekAmount: number;
  monthTransactions: number;
  monthAmount: number;
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalCustomers: 0,
    totalTransactions: 0,
    totalAmount: 0,
    totalDebts: 0,
    todayTransactions: 0,
    todayAmount: 0,
    weekTransactions: 0,
    weekAmount: 0,
    monthTransactions: 0,
    monthAmount: 0,
  });
  const [currencyBalances, setCurrencyBalances] = useState<TotalBalanceByCurrency[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = subDays(new Date(), 7).toISOString().split('T')[0];
      const monthAgo = subDays(new Date(), 30).toISOString().split('T')[0];

      const [
        customersResult,
        allTransactionsResult,
        todayTransactionsResult,
        weekTransactionsResult,
        monthTransactionsResult,
        debtsResult,
        currencyBalancesResult,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('transactions').select('amount_sent'),
        supabase.from('transactions').select('amount_sent').gte('created_at', today),
        supabase.from('transactions').select('amount_sent').gte('created_at', weekAgo),
        supabase.from('transactions').select('amount_sent').gte('created_at', monthAgo),
        supabase.from('debts').select('amount, paid_amount').eq('status', 'pending'),
        supabase.from('total_balances_by_currency').select('*'),
      ]);

      const totalAmount = allTransactionsResult.data?.reduce(
        (sum, t) => sum + Number(t.amount_sent),
        0
      ) || 0;

      const todayAmount = todayTransactionsResult.data?.reduce(
        (sum, t) => sum + Number(t.amount_sent),
        0
      ) || 0;

      const weekAmount = weekTransactionsResult.data?.reduce(
        (sum, t) => sum + Number(t.amount_sent),
        0
      ) || 0;

      const monthAmount = monthTransactionsResult.data?.reduce(
        (sum, t) => sum + Number(t.amount_sent),
        0
      ) || 0;

      const totalDebts = debtsResult.data?.reduce(
        (sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)),
        0
      ) || 0;

      setStats({
        totalCustomers: customersResult.count || 0,
        totalTransactions: allTransactionsResult.data?.length || 0,
        totalAmount,
        totalDebts,
        todayTransactions: todayTransactionsResult.data?.length || 0,
        todayAmount,
        weekTransactions: weekTransactionsResult.data?.length || 0,
        weekAmount,
        monthTransactions: monthTransactionsResult.data?.length || 0,
        monthAmount,
      });

      setCurrencyBalances(currencyBalancesResult.data || []);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const getCurrencyInfo = (code: string) => {
    const currency = CURRENCIES.find((c) => c.code === code);
    return currency || { code, name: code, symbol: code };
  };

  const statCards = [
    {
      title: 'إجمالي العملاء',
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
    },
    {
      title: 'إجمالي الحوالات',
      value: stats.totalTransactions.toString(),
      icon: TrendingUp,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      title: 'إجمالي المبالغ',
      value: `${stats.totalAmount.toFixed(0)} $`,
      icon: DollarSign,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      title: 'إجمالي الديون',
      value: `${stats.totalDebts.toFixed(0)} $`,
      icon: AlertCircle,
      color: '#EF4444',
      bgColor: '#FEE2E2',
    },
  ];

  const periodStats = [
    {
      title: 'حوالات اليوم',
      transactions: stats.todayTransactions,
      amount: stats.todayAmount,
      color: '#4F46E5',
    },
    {
      title: 'حوالات الأسبوع',
      transactions: stats.weekTransactions,
      amount: stats.weekAmount,
      color: '#10B981',
    },
    {
      title: 'حوالات الشهر',
      transactions: stats.monthTransactions,
      amount: stats.monthAmount,
      color: '#F59E0B',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowRight size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإحصائيات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.statsGrid}>
          {statCards.map((card, index) => (
            <View key={index} style={[styles.statCard, { backgroundColor: card.bgColor }]}>
              <card.icon size={32} color={card.color} />
              <Text style={styles.statValue}>{card.value}</Text>
              <Text style={styles.statLabel}>{card.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.periodSection}>
          <Text style={styles.sectionTitle}>إحصائيات الفترات</Text>
          {periodStats.map((period, index) => (
            <View key={index} style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>{period.title}</Text>
                <View style={[styles.periodBadge, { backgroundColor: `${period.color}15` }]}>
                  <Calendar size={16} color={period.color} />
                </View>
              </View>
              <View style={styles.periodStats}>
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>عدد الحوالات</Text>
                  <Text style={[styles.periodStatValue, { color: period.color }]}>
                    {period.transactions}
                  </Text>
                </View>
                <View style={styles.periodDivider} />
                <View style={styles.periodStat}>
                  <Text style={styles.periodStatLabel}>إجمالي المبلغ</Text>
                  <Text style={[styles.periodStatValue, { color: period.color }]}>
                    ${period.amount.toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.balancesSection}>
          <View style={styles.balancesSectionHeader}>
            <Coins size={24} color="#4F46E5" />
            <Text style={styles.sectionTitle}>مطابقة المبالغ حسب العملات</Text>
          </View>

          {currencyBalances.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد حركات بعد</Text>
            </View>
          ) : (
            currencyBalances.map((balance, index) => {
              const currencyInfo = getCurrencyInfo(balance.currency);
              const isPositive = balance.balance > 0;
              const isNegative = balance.balance < 0;

              return (
                <View key={index} style={styles.balanceCard}>
                  <View style={styles.balanceCardHeader}>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencySymbol}>{currencyInfo.symbol}</Text>
                      <Text style={styles.currencyName}>{currencyInfo.name}</Text>
                    </View>
                  </View>

                  <View style={styles.balanceDetails}>
                    <View style={styles.balanceRow}>
                      <View style={styles.balanceItem}>
                        <View style={styles.balanceItemHeader}>
                          <TrendingDown size={18} color="#10B981" />
                          <Text style={styles.balanceItemLabel}>عندي (وارد)</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#10B981' }]}>
                          {balance.total_incoming.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.balanceDivider} />

                      <View style={styles.balanceItem}>
                        <View style={styles.balanceItemHeader}>
                          <TrendingUp size={18} color="#EF4444" />
                          <Text style={styles.balanceItemLabel}>لي (صادر)</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#EF4444' }]}>
                          {balance.total_outgoing.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.balanceSeparator} />

                    <View style={styles.netBalanceContainer}>
                      <Text style={styles.netBalanceLabel}>الفارق الصافي</Text>
                      <View style={styles.netBalanceValueContainer}>
                        <Text
                          style={[
                            styles.netBalanceValue,
                            {
                              color: isPositive ? '#10B981' : isNegative ? '#EF4444' : '#6B7280',
                            },
                          ]}
                        >
                          {isPositive && '+'}
                          {balance.balance.toFixed(2)} {currencyInfo.symbol}
                        </Text>
                      </View>
                      <Text style={styles.netBalanceDescription}>
                        {isPositive
                          ? 'لك (المبالغ الصادرة أكثر)'
                          : isNegative
                          ? 'عليك (المبالغ الواردة أكثر)'
                          : 'متوازن'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  periodSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'right',
  },
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  periodBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodStat: {
    flex: 1,
    alignItems: 'center',
  },
  periodStatLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  periodStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  periodDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  balancesSection: {
    padding: 16,
  },
  balancesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  balanceCardHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  currencyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  balanceDetails: {
    gap: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  balanceItemLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  balanceItemValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  balanceDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },
  balanceSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  netBalanceContainer: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  netBalanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  netBalanceValueContainer: {
    marginBottom: 4,
  },
  netBalanceValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  netBalanceDescription: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});
