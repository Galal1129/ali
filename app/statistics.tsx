import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDataRefresh } from '@/contexts/DataRefreshContext';
import {
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  TrendingDown,
  Trophy,
  Percent,
  Activity,
  Wallet,
  Scale,
  CheckCircle,
} from 'lucide-react-native';
import { CURRENCIES } from '@/types/database';
import { StatisticsService, StatisticsData } from '@/services/statisticsService';

type PeriodFilter = 'today' | 'yesterday' | 'week' | 'month';

export default function StatisticsScreen() {
  const router = useRouter();
  const { lastRefreshTime } = useDataRefresh();
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('today');

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (!loading) {
      console.log('[Statistics] Auto-refreshing due to data change');
      loadStats();
    }
  }, [lastRefreshTime]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await StatisticsService.fetchAllStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setError(error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل الإحصاءات');
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

  if (loading) {
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

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowRight size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الإحصائيات</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <AlertCircle size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>خطأ في تحميل الإحصاءات</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryButtonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowRight size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الإحصائيات</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyStateContainer}>
          <AlertCircle size={64} color="#9CA3AF" />
          <Text style={styles.emptyStateTitle}>لا توجد بيانات</Text>
          <Text style={styles.emptyStateMessage}>
            لم يتم العثور على أي إحصاءات. يرجى المحاولة مرة أخرى.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadStats}>
            <Text style={styles.retryButtonText}>تحديث</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentPeriodStats = stats.periodStats[selectedPeriod];

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
        <View style={styles.balancesSection}>
          <View style={styles.sectionHeader}>
            <Wallet size={24} color="#4F46E5" />
            <Text style={styles.sectionTitle}>التدفق النقدي حسب العملة</Text>
          </View>

          {stats.cashFlowByCurrency.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>لا توجد حركات بعد</Text>
            </View>
          ) : (
            stats.cashFlowByCurrency.map((flow, index) => {
              const currencyInfo = getCurrencyInfo(flow.currency);
              const isPositive = flow.netFlow > 0;
              const isNegative = flow.netFlow < 0;

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
                          <TrendingUp size={18} color="#10B981" />
                          <Text style={styles.balanceItemLabel}>استلام من العميل</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#10B981' }]}>
                          {flow.totalReceived.toFixed(2)}
                        </Text>
                      </View>

                      <View style={styles.balanceDivider} />

                      <View style={styles.balanceItem}>
                        <View style={styles.balanceItemHeader}>
                          <TrendingDown size={18} color="#EF4444" />
                          <Text style={styles.balanceItemLabel}>تسليم للعميل</Text>
                        </View>
                        <Text style={[styles.balanceItemValue, { color: '#EF4444' }]}>
                          {flow.totalPaid.toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.balanceSeparator} />

                    <View style={styles.netBalanceContainer}>
                      <Text style={styles.netBalanceLabel}>الصافي</Text>
                      <View style={styles.netBalanceValueContainer}>
                        <Text
                          style={[
                            styles.netBalanceValue,
                            {
                              color: isPositive
                                ? '#10B981'
                                : isNegative
                                  ? '#EF4444'
                                  : '#6B7280',
                            },
                          ]}
                        >
                          {isPositive && '+ '}
                          {flow.netFlow.toFixed(2)} {currencyInfo.symbol}
                        </Text>
                      </View>
                      <Text style={styles.netBalanceDescription}>
                        {isPositive ? 'صافي قبض' : isNegative ? 'صافي صرف' : 'متوازن'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {stats.accountingBalance.length > 0 && (
          <View style={styles.accountingBalanceSection}>
            <View style={styles.sectionHeader}>
              <Scale size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>المطابقة المحاسبية</Text>
            </View>

            {stats.accountingBalanceSummary && (
              <View
                style={[
                  styles.summaryBanner,
                  stats.accountingBalanceSummary.unbalanced_currencies > 0
                    ? styles.summaryBannerWarning
                    : styles.summaryBannerSuccess,
                ]}
              >
                <View style={styles.summaryBannerContent}>
                  {stats.accountingBalanceSummary.unbalanced_currencies === 0 ? (
                    <CheckCircle size={24} color="#10B981" />
                  ) : (
                    <AlertCircle size={24} color="#F59E0B" />
                  )}
                  <View style={styles.summaryBannerText}>
                    <Text style={styles.summaryBannerTitle}>
                      {stats.accountingBalanceSummary.overall_status}
                    </Text>
                    <Text style={styles.summaryBannerSubtitle}>
                      {stats.accountingBalanceSummary.balanced_currencies} من{' '}
                      {stats.accountingBalanceSummary.total_currencies} عملة متوازنة
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {stats.accountingBalance.map((balance, index) => {
              const currencyInfo = getCurrencyInfo(balance.currency);
              const isBalanced = balance.is_balanced;

              return (
                <View
                  key={index}
                  style={[
                    styles.accountingBalanceCard,
                    !isBalanced && styles.accountingBalanceCardUnbalanced,
                  ]}
                >
                  <View style={styles.accountingBalanceHeader}>
                    <View style={styles.accountingBalanceCurrency}>
                      <Text style={styles.accountingBalanceCurrencySymbol}>
                        {currencyInfo.symbol}
                      </Text>
                      <Text style={styles.accountingBalanceCurrencyName}>
                        {currencyInfo.name}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.accountingBalanceStatusBadge,
                        isBalanced
                          ? styles.accountingBalanceStatusBadgeBalanced
                          : styles.accountingBalanceStatusBadgeUnbalanced,
                      ]}
                    >
                      {isBalanced ? (
                        <CheckCircle size={16} color="#10B981" />
                      ) : (
                        <AlertCircle size={16} color="#F59E0B" />
                      )}
                      <Text
                        style={[
                          styles.accountingBalanceStatusText,
                          isBalanced
                            ? styles.accountingBalanceStatusTextBalanced
                            : styles.accountingBalanceStatusTextUnbalanced,
                        ]}
                      >
                        {isBalanced ? 'متوازن' : 'غير متوازن'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.accountingBalanceDetails}>
                    <View style={styles.accountingBalanceRow}>
                      <View style={styles.accountingBalanceItem}>
                        <View style={styles.accountingBalanceItemHeader}>
                          <TrendingDown size={16} color="#EF4444" />
                          <Text style={styles.accountingBalanceItemLabel}>المدين (خروج)</Text>
                        </View>
                        <Text style={[styles.accountingBalanceItemValue, { color: '#EF4444' }]}>
                          {balance.total_debits.toFixed(2)}
                        </Text>
                        <Text style={styles.accountingBalanceItemCount}>
                          {balance.debit_count} حركة
                        </Text>
                      </View>

                      <View style={styles.accountingBalanceDivider} />

                      <View style={styles.accountingBalanceItem}>
                        <View style={styles.accountingBalanceItemHeader}>
                          <TrendingUp size={16} color="#10B981" />
                          <Text style={styles.accountingBalanceItemLabel}>الدائن (دخول)</Text>
                        </View>
                        <Text style={[styles.accountingBalanceItemValue, { color: '#10B981' }]}>
                          {balance.total_credits.toFixed(2)}
                        </Text>
                        <Text style={styles.accountingBalanceItemCount}>
                          {balance.credit_count} حركة
                        </Text>
                      </View>
                    </View>

                    {!isBalanced && (
                      <View style={styles.accountingBalanceDifferenceContainer}>
                        <AlertCircle size={16} color="#F59E0B" />
                        <Text style={styles.accountingBalanceDifferenceText}>
                          فرق: {balance.absolute_difference.toFixed(2)} {currencyInfo.symbol}
                        </Text>
                      </View>
                    )}

                    <View style={styles.accountingBalanceEquation}>
                      <Text style={styles.accountingBalanceEquationText}>
                        المعادلة: {balance.total_debits.toFixed(2)} ={' '}
                        {balance.total_credits.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.accountingBalanceExplanation}>
              <AlertCircle size={16} color="#6B7280" />
              <Text style={styles.accountingBalanceExplanationText}>
                في النظام المحاسبي الصحيح، يجب أن يكون مجموع المدين = مجموع الدائن لكل عملة
              </Text>
            </View>
          </View>
        )}

        {(stats.debtStats.owedToUsByCurrency.length > 0 ||
          stats.debtStats.weOweByCurrency.length > 0) && (
          <View style={styles.debtSection}>
            <View style={styles.sectionHeader}>
              <AlertCircle size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>ملخص الديون</Text>
            </View>

            {stats.debtStats.owedToUsByCurrency.length > 0 && (
              <View style={styles.debtCard}>
                <Text style={styles.debtCardTitle}>لنا عند العملاء</Text>
                {stats.debtStats.owedToUsByCurrency.map((item, index) => {
                  const currencyInfo = getCurrencyInfo(item.currency);
                  return (
                    <View key={index} style={styles.debtRow}>
                      <Text style={styles.debtCurrency}>{currencyInfo.name}</Text>
                      <Text style={[styles.debtAmount, { color: '#10B981' }]}>
                        {item.amount.toFixed(2)} {currencyInfo.symbol}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}

            {stats.debtStats.weOweByCurrency.length > 0 && (
              <View style={styles.debtCard}>
                <Text style={styles.debtCardTitle}>للعملاء عندنا</Text>
                {stats.debtStats.weOweByCurrency.map((item, index) => {
                  const currencyInfo = getCurrencyInfo(item.currency);
                  return (
                    <View key={index} style={styles.debtRow}>
                      <Text style={styles.debtCurrency}>{currencyInfo.name}</Text>
                      <Text style={[styles.debtAmount, { color: '#EF4444' }]}>
                        {item.amount.toFixed(2)} {currencyInfo.symbol}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
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
                    <Text style={styles.topCustomerStatValue}>{customer.totalMovements}</Text>
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
                      {customer.balance > 0 ? 'لنا' : customer.balance < 0 ? 'له' : '-'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

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
                  style={[styles.periodStatValue, { color: getPeriodColor(selectedPeriod) }]}
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
                  style={[styles.periodStatValue, { color: getPeriodColor(selectedPeriod) }]}
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
                  style={[styles.periodStatValue, { color: getPeriodColor(selectedPeriod) }]}
                >
                  {currentPeriodStats.commissionAmount > 0
                    ? currentPeriodStats.commissionAmount.toFixed(0)
                    : '-'}
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
                    <Text style={styles.commissionAmount}>{item.total.toFixed(2)}</Text>
                    <Text style={styles.commissionLabel}>{currencyInfo.name}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
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
  debtSection: {
    padding: 16,
  },
  debtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  debtCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'right',
  },
  debtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  debtCurrency: {
    fontSize: 14,
    color: '#6B7280',
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  accountingBalanceSection: {
    padding: 16,
  },
  summaryBanner: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryBannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  summaryBannerWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  summaryBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryBannerText: {
    flex: 1,
  },
  summaryBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'right',
  },
  summaryBannerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  accountingBalanceCard: {
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
  accountingBalanceCardUnbalanced: {
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  accountingBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  accountingBalanceCurrency: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountingBalanceCurrencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B5CF6',
  },
  accountingBalanceCurrencyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  accountingBalanceStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  accountingBalanceStatusBadgeBalanced: {
    backgroundColor: '#D1FAE5',
  },
  accountingBalanceStatusBadgeUnbalanced: {
    backgroundColor: '#FEF3C7',
  },
  accountingBalanceStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountingBalanceStatusTextBalanced: {
    color: '#059669',
  },
  accountingBalanceStatusTextUnbalanced: {
    color: '#D97706',
  },
  accountingBalanceDetails: {
    gap: 12,
  },
  accountingBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  accountingBalanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  accountingBalanceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  accountingBalanceItemLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  accountingBalanceItemValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountingBalanceItemCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  accountingBalanceDivider: {
    width: 1,
    height: 80,
    backgroundColor: '#E5E7EB',
  },
  accountingBalanceDifferenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
  },
  accountingBalanceDifferenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  accountingBalanceEquation: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  accountingBalanceEquationText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  accountingBalanceExplanation: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginTop: 4,
  },
  accountingBalanceExplanationText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'right',
  },
});
