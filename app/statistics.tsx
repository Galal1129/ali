import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  I18nManager,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  TrendingUp,
  Users,
  DollarSign,
  AlertCircle,
  Calendar,
  TrendingDown,
  Coins,
  ArrowLeftRight,
  Trophy,
  Percent,
  Activity
} from 'lucide-react-native';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { TotalBalanceByCurrency, CURRENCIES } from '@/types/database';
import { StatisticsService, StatisticsData } from '@/services/statisticsService';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month';

export default function StatisticsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('today');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await StatisticsService.fetchAllStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
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

  const getPeriodLabel = (period: PeriodFilter) => {
    switch (period) {
      case 'today':
        return 'اليوم';
      case 'yesterday':
        return 'أمس';
      case 'week':
        return 'آخر 7 أيام';
      case 'month':
        return 'آخر 30 يوم';
    }
  };

  const getPeriodColor = (period: PeriodFilter) => {
    switch (period) {
      case 'today':
        return '#4F46E5';
      case 'yesterday':
        return '#8B5CF6';
      case 'week':
        return '#10B981';
      case 'month':
        return '#F59E0B';
    }
  };

  if (loading || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowRight size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الإحصائيات</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>جاري تحميل الإحصائيات...</Text>
        </View>
      </View>
    );
  }

  const currentPeriodStats = stats.periodStats[selectedPeriod];

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
      title: 'إجمالي الحركات',
      value: stats.totalMovements.toString(),
      icon: ArrowLeftRight,
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
    },
    {
      title: 'إجمالي المبالغ',
      value: `${stats.totalAmount.toFixed(0)} $`,
      icon: DollarSign,
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      title: 'إجمالي العمولات',
      value: `${stats.commissionStats.totalCommission.toFixed(0)}`,
      icon: Percent,
      color: '#06B6D4',
      bgColor: '#CFFAFE',
    },
    {
      title: 'إجمالي الديون',
      value: `${stats.totalDebts.toFixed(0)} $`,
      icon: AlertCircle,
      color: '#EF4444',
      bgColor: '#FEE2E2',
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
          <View style={styles.sectionHeader}>
            <Activity size={24} color="#4F46E5" />
            <Text style={styles.sectionTitle}>إحصائيات الفترات</Text>
          </View>

          <View style={styles.periodFilterContainer}>
            {(['today', 'yesterday', 'week', 'month'] as PeriodFilter[]).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodFilterButton,
                  selectedPeriod === period && {
                    backgroundColor: getPeriodColor(period),
                  },
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodFilterText,
                    selectedPeriod === period && styles.periodFilterTextActive,
                  ]}
                >
                  {getPeriodLabel(period)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.periodCard}>
            <View style={styles.periodHeader}>
              <Text style={styles.periodTitle}>{getPeriodLabel(selectedPeriod)}</Text>
              <View
                style={[
                  styles.periodBadge,
                  { backgroundColor: `${getPeriodColor(selectedPeriod)}15` },
                ]}
              >
                <Calendar size={16} color={getPeriodColor(selectedPeriod)} />
              </View>
            </View>

            <View style={styles.periodStatsGrid}>
              <View style={styles.periodStatBox}>
                <Text style={styles.periodStatLabel}>الحوالات</Text>
                <Text
                  style={[
                    styles.periodStatValue,
                    { color: getPeriodColor(selectedPeriod) },
                  ]}
                >
                  {currentPeriodStats.transactions}
                </Text>
                <Text style={styles.periodStatAmount}>
                  ${currentPeriodStats.transactionAmount.toFixed(0)}
                </Text>
              </View>

              <View style={styles.periodDivider} />

              <View style={styles.periodStatBox}>
                <Text style={styles.periodStatLabel}>الحركات</Text>
                <Text
                  style={[
                    styles.periodStatValue,
                    { color: getPeriodColor(selectedPeriod) },
                  ]}
                >
                  {currentPeriodStats.movements}
                </Text>
                <Text style={styles.periodStatAmount}>
                  ${currentPeriodStats.movementAmount.toFixed(0)}
                </Text>
              </View>

              <View style={styles.periodDivider} />

              <View style={styles.periodStatBox}>
                <Text style={styles.periodStatLabel}>العمولات</Text>
                <Text
                  style={[
                    styles.periodStatValue,
                    { color: getPeriodColor(selectedPeriod) },
                  ]}
                >
                  {currentPeriodStats.commissionAmount > 0 ? '✓' : '-'}
                </Text>
                <Text style={styles.periodStatAmount}>
                  ${currentPeriodStats.commissionAmount.toFixed(0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {stats.commissionStats.commissionByCurrency.length > 0 && (
          <View style={styles.commissionSection}>
            <View style={styles.sectionHeader}>
              <Percent size={24} color="#06B6D4" />
              <Text style={styles.sectionTitle}>العمولات حسب العملة</Text>
            </View>

            <View style={styles.commissionGrid}>
              {stats.commissionStats.commissionByCurrency.map((item, index) => {
                const currencyInfo = getCurrencyInfo(item.currency);
                return (
                  <View key={index} style={styles.commissionCard}>
                    <Text style={styles.commissionCurrency}>{currencyInfo.symbol}</Text>
                    <Text style={styles.commissionAmount}>
                      {item.total.toFixed(2)}
                    </Text>
                    <Text style={styles.commissionLabel}>{currencyInfo.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {stats.topCustomers.length > 0 && (
          <View style={styles.topCustomersSection}>
            <View style={styles.sectionHeader}>
              <Trophy size={24} color="#F59E0B" />
              <Text style={styles.sectionTitle}>أكثر العملاء نشاطاً</Text>
            </View>

            {stats.topCustomers.map((customer, index) => (
              <View key={customer.id} style={styles.topCustomerCard}>
                <View style={styles.topCustomerRank}>
                  <Text style={styles.topCustomerRankText}>{index + 1}</Text>
                </View>

                <View style={styles.topCustomerInfo}>
                  <Text style={styles.topCustomerName}>{customer.name}</Text>
                  <Text style={styles.topCustomerPhone}>{customer.phone}</Text>
                </View>

                <View style={styles.topCustomerStats}>
                  <View style={styles.topCustomerStatItem}>
                    <Text style={styles.topCustomerStatLabel}>الحركات</Text>
                    <Text style={styles.topCustomerStatValue}>
                      {customer.totalMovements}
                    </Text>
                  </View>
                  <View style={styles.topCustomerStatDivider} />
                  <View style={styles.topCustomerStatItem}>
                    <Text style={styles.topCustomerStatLabel}>الرصيد</Text>
                    <Text
                      style={[
                        styles.topCustomerStatValue,
                        {
                          color:
                            customer.balance > 0
                              ? '#10B981'
                              : customer.balance < 0
                              ? '#EF4444'
                              : '#6B7280',
                        },
                      ]}
                    >
                      {customer.balance > 0 && '+'}
                      {customer.balance.toFixed(0)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.balancesSection}>
          <View style={styles.sectionHeader}>
            <Coins size={24} color="#4F46E5" />
            <Text style={styles.sectionTitle}>مطابقة المبالغ حسب العملات</Text>
          </View>

          {stats.currencyBalances.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد حركات بعد</Text>
            </View>
          ) : (
            stats.currencyBalances.map((balance, index) => {
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
                          <TrendingUp size={18} color="#EF4444" />
                          <Text style={styles.balanceItemLabel}>استلمت منه (صادر)</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#EF4444' }]}>
                          {balance.total_outgoing.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.balanceDivider} />

                      <View style={styles.balanceItem}>
                        <View style={styles.balanceItemHeader}>
                          <TrendingDown size={18} color="#10B981" />
                          <Text style={styles.balanceItemLabel}>سلمت له (وارد)</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#10B981' }]}>
                          {balance.total_incoming.toFixed(2)}
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
                              color: isPositive ? '#EF4444' : isNegative ? '#10B981' : '#6B7280',
                            },
                          ]}
                        >
                          {isPositive && '+ '}
                          {balance.balance.toFixed(2)} {currencyInfo.symbol}
                        </Text>
                      </View>
                      <Text style={styles.netBalanceDescription}>
                        {isPositive
                          ? 'عليك (استلمت أكثر مما سلمت)'
                          : isNegative
                          ? 'لك (سلمت أكثر مما استلمت)'
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'right',
  },
  periodFilterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodFilterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  periodFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodFilterTextActive: {
    color: '#FFFFFF',
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
    marginBottom: 20,
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
  periodStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  periodStatLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  periodStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  periodStatAmount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  periodDivider: {
    width: 1,
    height: 70,
    backgroundColor: '#E5E7EB',
  },
  commissionSection: {
    padding: 16,
  },
  commissionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  commissionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  commissionCurrency: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#06B6D4',
    marginBottom: 8,
  },
  commissionAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  commissionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  topCustomersSection: {
    padding: 16,
  },
  topCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topCustomerRank: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topCustomerRankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  topCustomerInfo: {
    flex: 1,
  },
  topCustomerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  topCustomerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  topCustomerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topCustomerStatItem: {
    alignItems: 'center',
  },
  topCustomerStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  topCustomerStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  topCustomerStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  balancesSection: {
    padding: 16,
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
