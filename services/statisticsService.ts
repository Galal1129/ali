import { supabase } from '@/lib/supabase';
import { fetchAllRows } from '@/lib/fetchAll';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { TotalBalanceByCurrency } from '@/types/database';

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

export interface CashFlowByCurrency {
  currency: string;
  totalReceived: number;
  totalPaid: number;
  netFlow: number;
}

export interface DebtStats {
  totalOwedToUs: number;
  totalWeOwe: number;
  owedToUsByCurrency: { currency: string; amount: number }[];
  weOweByCurrency: { currency: string; amount: number }[];
}

export interface StatisticsData {
  totalCustomers: number;
  totalTransactions: number;
  totalMovements: number;
  totalAmount: number;
  totalDebts: number;
  totalWeOwe: number;
  periodStats: {
    today: PeriodStats;
    yesterday: PeriodStats;
    week: PeriodStats;
    month: PeriodStats;
  };
  currencyBalances: TotalBalanceByCurrency[];
  cashFlowByCurrency: CashFlowByCurrency[];
  topCustomers: TopCustomer[];
  commissionStats: CommissionStats;
  debtStats: DebtStats;
}

export class StatisticsService {
  static async fetchPeriodStats(startDate: Date, endDate: Date): Promise<PeriodStats> {
    const start = startOfDay(startDate).toISOString();
    const end = endOfDay(endDate).toISOString();

    try {
      const [transactions, movements] = await Promise.all([
        fetchAllRows<{ amount_sent: number }>(
          'transactions',
          'amount_sent',
          [{ column: 'id', ascending: true }],
          (query) => query.gte('created_at', start).lte('created_at', end)
        ),
        fetchAllRows<{ amount: number; commission: number | null; commission_currency: string | null }>(
          'account_movements',
          'amount, commission, commission_currency',
          [{ column: 'id', ascending: true }],
          (query) => query.gte('created_at', start).lte('created_at', end)
        ),
      ]);

      const transactionAmount = transactions.reduce(
        (sum, t) => sum + Number(t.amount_sent),
        0
      );

      const movementAmount = movements.reduce((sum, m) => sum + Number(m.amount), 0);

      const commissionAmount = movements.reduce(
        (sum, m) => sum + (m.commission ? Number(m.commission) : 0),
        0
      );

      return {
        transactions: transactions.length,
        movements: movements.length,
        transactionAmount,
        movementAmount,
        commissionAmount,
      };
    } catch (error) {
      console.error('Error fetching period stats:', error);
      return {
        transactions: 0,
        movements: 0,
        transactionAmount: 0,
        movementAmount: 0,
        commissionAmount: 0,
      };
    }
  }

  static async fetchTopCustomers(limit: number = 5): Promise<TopCustomer[]> {
    const { data, error } = await supabase
      .from('customer_accounts')
      .select('*')
      .order('total_movements', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }

    if (!data) {
      return [];
    }

    return data.map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      totalMovements: customer.total_movements || 0,
      balance: Number(customer.balance) || 0,
      lastActivity: customer.updated_at || customer.created_at,
    }));
  }

  static async fetchCommissionStats(): Promise<CommissionStats> {
    let data: { commission: number | null; commission_currency: string | null }[];

    try {
      data = await fetchAllRows(
        'account_movements',
        'commission, commission_currency',
        [{ column: 'id', ascending: true }],
        (query) => query.not('commission', 'is', null).gt('commission', 0)
      );
    } catch (error) {
      console.error('Error fetching commission stats:', error);
      return {
        totalCommission: 0,
        commissionByCurrency: [],
      };
    }

    if (!data || data.length === 0) {
      return {
        totalCommission: 0,
        commissionByCurrency: [],
      };
    }

    const totalCommission = data.reduce(
      (sum, m) => sum + (m.commission ? Number(m.commission) : 0),
      0
    );

    const commissionByCurrency = data.reduce(
      (acc, m) => {
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
      },
      [] as { currency: string; total: number }[]
    );

    return {
      totalCommission,
      commissionByCurrency: commissionByCurrency.sort((a, b) => b.total - a.total),
    };
  }

  static async fetchDebtStats(): Promise<DebtStats> {
    let balances: { balance: number; currency: string }[];

    try {
      balances = await fetchAllRows(
        'customer_balances_by_currency',
        'customer_id, currency, balance',
        [
          { column: 'customer_id', ascending: true },
          { column: 'currency', ascending: true },
        ]
      );
    } catch (error) {
      console.error('Error fetching debt stats:', error);
      return {
        totalOwedToUs: 0,
        totalWeOwe: 0,
        owedToUsByCurrency: [],
        weOweByCurrency: [],
      };
    }

    if (!balances || balances.length === 0) {
      return {
        totalOwedToUs: 0,
        totalWeOwe: 0,
        owedToUsByCurrency: [],
        weOweByCurrency: [],
      };
    }

    const owedToUsByCurrency: { [key: string]: number } = {};
    const weOweByCurrency: { [key: string]: number } = {};

    balances.forEach((balance) => {
      const amount = Number(balance.balance);
      const currency = balance.currency;

      if (amount > 0) {
        weOweByCurrency[currency] = (weOweByCurrency[currency] || 0) + amount;
      } else if (amount < 0) {
        owedToUsByCurrency[currency] = (owedToUsByCurrency[currency] || 0) + Math.abs(amount);
      }
    });

    const totalOwedToUs = Object.values(owedToUsByCurrency).reduce(
      (sum, val) => sum + val,
      0
    );
    const totalWeOwe = Object.values(weOweByCurrency).reduce((sum, val) => sum + val, 0);

    return {
      totalOwedToUs,
      totalWeOwe,
      owedToUsByCurrency: Object.entries(owedToUsByCurrency).map(([currency, amount]) => ({
        currency,
        amount,
      })),
      weOweByCurrency: Object.entries(weOweByCurrency).map(([currency, amount]) => ({
        currency,
        amount,
      })),
    };
  }

  static async fetchCashFlowByCurrency(): Promise<CashFlowByCurrency[]> {
    let movements: {
      amount: number;
      currency: string;
      movement_type: string;
      is_internal_transfer: boolean | null;
    }[];

    try {
      movements = await fetchAllRows(
        'account_movements',
        'amount, currency, movement_type, is_internal_transfer',
        [{ column: 'id', ascending: true }],
        (query) => query.or('is_internal_transfer.is.null,is_internal_transfer.eq.false')
      );
    } catch (error) {
      console.error('Error fetching cash flow:', error);
      return [];
    }

    if (!movements || movements.length === 0) {
      return [];
    }

    const flowByCurrency: { [key: string]: CashFlowByCurrency } = {};

    movements.forEach((movement) => {
      const currency = movement.currency;
      const amount = Number(movement.amount);

      if (!flowByCurrency[currency]) {
        flowByCurrency[currency] = {
          currency,
          totalReceived: 0,
          totalPaid: 0,
          netFlow: 0,
        };
      }

      if (movement.movement_type === 'outgoing') {
        flowByCurrency[currency].totalReceived += amount;
      } else if (movement.movement_type === 'incoming') {
        flowByCurrency[currency].totalPaid += amount;
      }
    });

    Object.values(flowByCurrency).forEach((flow) => {
      flow.netFlow = flow.totalReceived - flow.totalPaid;
    });

    return Object.values(flowByCurrency);
  }

  static async fetchAllStatistics(): Promise<StatisticsData> {
    try {
      const now = new Date();
      const today = now;
      const yesterday = subDays(now, 1);
      const weekAgo = subDays(now, 7);
      const monthAgo = subDays(now, 30);

      const [
        customersResult,
        allTransactionsResult,
        allMovementsResult,
        currencyBalancesResult,
        todayStats,
        yesterdayStats,
        weekStats,
        monthStats,
        topCustomers,
        commissionStats,
        debtStats,
        cashFlowByCurrency,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        fetchAllRows<{ amount_sent: number }>('transactions', 'amount_sent', [
          { column: 'id', ascending: true },
        ]).catch((error) => {
          console.error('Error fetching transactions:', error);
          return [] as { amount_sent: number }[];
        }),
        fetchAllRows<{ amount: number }>('account_movements', 'amount', [
          { column: 'id', ascending: true },
        ]).catch((error) => {
          console.error('Error fetching movements:', error);
          return [] as { amount: number }[];
        }),
        supabase.from('total_balances_by_currency').select('*'),
        this.fetchPeriodStats(today, today),
        this.fetchPeriodStats(yesterday, yesterday),
        this.fetchPeriodStats(weekAgo, today),
        this.fetchPeriodStats(monthAgo, today),
        this.fetchTopCustomers(5),
        this.fetchCommissionStats(),
        this.fetchDebtStats(),
        this.fetchCashFlowByCurrency(),
      ]);

      if (customersResult.error) {
        console.error('Error fetching customers count:', customersResult.error);
      }
      if (currencyBalancesResult.error) {
        console.error('Error fetching currency balances:', currencyBalancesResult.error);
      }

      const totalAmount = allMovementsResult.reduce(
        (sum, m) => sum + Number(m.amount),
        0
      );

      return {
        totalCustomers: customersResult.count || 0,
        totalTransactions: allTransactionsResult.length,
        totalMovements: allMovementsResult.length,
        totalAmount,
        totalDebts: debtStats.totalOwedToUs,
        totalWeOwe: debtStats.totalWeOwe,
        periodStats: {
          today: todayStats,
          yesterday: yesterdayStats,
          week: weekStats,
          month: monthStats,
        },
        currencyBalances: currencyBalancesResult.data || [],
        cashFlowByCurrency,
        topCustomers,
        commissionStats,
        debtStats,
      };
    } catch (error) {
      console.error('Error in fetchAllStatistics:', error);
      throw error;
    }
  }

  static async fetchCustomDateRangeStats(
    startDate: Date,
    endDate: Date
  ): Promise<PeriodStats> {
    return this.fetchPeriodStats(startDate, endDate);
  }
}
