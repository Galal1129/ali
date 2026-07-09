import { supabase } from './supabase';

const PAGE_SIZE = 1000;

interface OrderBy {
  column: string;
  ascending?: boolean;
}

/**
 * يجلب كل صفوف الجدول على دفعات متتالية لتجاوز حد Supabase الافتراضي (1000 صف لكل طلب).
 * الترتيب مطلوب لضمان ثبات الدفعات وعدم تكرار أو فقدان صفوف بين الطلبات.
 * applyFilters تسمح بإضافة شروط (gte/lte/gt/or...) على الاستعلام قبل التقسيم لدفعات.
 */
export async function fetchAllRows<T>(
  table: string,
  select: string = '*',
  orders: OrderBy[] = [{ column: 'id', ascending: true }],
  applyFilters?: (query: any) => any
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;

  while (true) {
    let query: any = supabase.from(table).select(select);

    if (applyFilters) {
      query = applyFilters(query);
    }

    for (const order of orders) {
      query = query.order(order.column, { ascending: order.ascending ?? true });
    }

    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw error;
    }

    const batch = (data || []) as T[];
    allRows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return allRows;
}
