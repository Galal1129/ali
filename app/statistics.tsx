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
import { ArrowRight, TrendingUp, Users, DollarSign, AlertCircle, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { format, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

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
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('transactions').select('amount_sent'),
        supabase.from('transactions').select('amount_sent').gte('created_at', today),
        supabase.from('transactions').select('amount_sent').gte('created_at', weekAgo),
        supabase.from('transactions').select('amount_sent').gte('created_at', monthAgo),
        supabase.from('debts').select('amount, paid_amount').eq('status', 'pending'),
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
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
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
});
