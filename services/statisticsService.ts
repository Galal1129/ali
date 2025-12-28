import { supabase } from '@/lib/supabase';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { TotalBalanceByCurrency, CustomerBalanceByCurrency } from '@/types/database';

export interface PeriodStats {
  transactions: number;
  movements: number;
  transactionAmount: number;
  movementAmount: number;
  commissionAmount: number;
}

export interface TopCustomer {
  id: string;
  name: string;
  phone: string;
  totalMovements: number;
  balance: number;
  lastActivity: string;
}

export interface CommissionStats {
  totalCommission: number;
  commissionByCurrency: { currency: string; total: number }[];
}

export interface StatisticsData {
  totalCustomers: number;
  totalTransactions: number;
  totalMovements: number;
  totalAmount: number;
  totalDebts: number;
  periodStats: {
    today: PeriodStats;
    yesterday: PeriodStats;
    week: PeriodStats;
    month: PeriodStats;
  };
  currencyBalances: TotalBalanceByCurrency[];
  topCustomers: TopCustomer[];
  commissionStats: CommissionStats;
}

export class StatisticsService {
  static async fetchPeriodStats(startDate: Date, endDate: Date): Promise<PeriodStats> {
    const start = startOfDay(startDate).toISOString();
    const end = endOfDay(endDate).toISOString();

    const [transactionsResult, movementsResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('amount_sent')
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('account_movements')
        .select('amount, commission, commission_currency')
        .gte('created_at', start)
        .lte('created_at', end),
    ]);

    const transactionAmount = transactionsResult.data?.reduce(
      (sum, t) => sum + Number(t.amount_sent),
      0
    ) || 0;

    const movementAmount = movementsResult.data?.reduce(
      (sum, m) => sum + Number(m.amount),
      0
    ) || 0;

    const commissionAmount = movementsResult.data?.reduce(
      (sum, m) => sum + (m.commission ? Number(m.commission) : 0),
      0
    ) || 0;

    return {
      transactions: transactionsResult.data?.length || 0,
      movements: movementsResult.data?.length || 0,
      transactionAmount,
      movementAmount,
      commissionAmount,
    };
  }

  static async fetchTopCustomers(limit: number = 5): Promise<TopCustomer[]> {
    const { data, error } = await supabase
      .from('customer_accounts')
      .select('*')
      .order('total_movements', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalMovements: customer.total_movements || 0,
      balance: customer.balance || 0,
      lastActivity: customer.updated_at || customer.created_at,
    }));
  }

  static async fetchCommissionStats(): Promise<CommissionStats> {
    const { data, error } = await supabase
      .from('account_movements')
      .select('commission, commission_currency')
      .not('commission', 'is', null)
      .gt('commission', 0);

    if (error || !data) {
      return {
        totalCommission: 0,
        commissionByCurrency: [],
      };
    }

    const totalCommission = data.reduce(
      (sum, m) => sum + (m.commission ? Number(m.commission) : 0),
      0
    );

    const commissionByCurrency = data.reduce((acc, m) => {
      if (!m.commission || !m.commission_currency) return acc;

      const existing = acc.find((item) => item.currency === m.commission_currency);
      if (existing) {
        existing.total += Number(m.commission);
      } else {
        acc.push({
          currency: m.commission_currency,
          total: Number(m.commission),
        });
      }
      return acc;
    }, [] as { currency: string; total: number }[]);

    return {
      totalCommission,
      commissionByCurrency: commissionByCurrency.sort((a, b) => b.total - a.total),
    };
  }

  static async fetchAllStatistics(): Promise<StatisticsData> {
    const now = new Date();
    const today = now;
    const yesterday = subDays(now, 1);
    const weekAgo = subDays(now, 7);
    const monthAgo = subDays(now, 30);

    const [
      customersResult,
      allTransactionsResult,
      allMovementsResult,
      debtsResult,
      currencyBalancesResult,
      todayStats,
      yesterdayStats,
      weekStats,
      monthStats,
      topCustomers,
      commissionStats,
    ] = await Promise.all([
      supabase.from('customers').select('id', { count: 'exact' }),
      supabase.from('transactions').select('amount_sent'),
      supabase.from('account_movements').select('id'),
      supabase.from('debts').select('amount, paid_amount').eq('status', 'pending'),
      supabase.from('total_balances_by_currency').select('*'),
      this.fetchPeriodStats(today, today),
      this.fetchPeriodStats(yesterday, yesterday),
      this.fetchPeriodStats(weekAgo, today),
      this.fetchPeriodStats(monthAgo, today),
      this.fetchTopCustomers(5),
      this.fetchCommissionStats(),
    ]);

    const totalAmount = allTransactionsResult.data?.reduce(
      (sum, t) => sum + Number(t.amount_sent),
      0
    ) || 0;

    const totalDebts = debtsResult.data?.reduce(
      (sum, d) => sum + (Number(d.amount) - Number(d.paid_amount)),
      0
    ) || 0;

    return {
      totalCustomers: customersResult.count || 0,
      totalTransactions: allTransactionsResult.data?.length || 0,
      totalMovements: allMovementsResult.data?.length || 0,
      totalAmount,
      totalDebts,
      periodStats: {
        today: todayStats,
        yesterday: yesterdayStats,
        week: weekStats,
        month: monthStats,
      },
      currencyBalances: currencyBalancesResult.data || [],
      topCustomers,
      commissionStats,
    };
  }

  static async fetchCustomDateRangeStats(startDate: Date, endDate: Date): Promise<PeriodStats> {
    return this.fetchPeriodStats(startDate, endDate);
  }
}
