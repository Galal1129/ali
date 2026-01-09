# إصلاح عرض المبلغ في قائمة الحركات وكشف الحساب

## المشكلة

عند إنشاء تحويل داخلي مع عمولة لصالح المُحوِّل:
- **قاعدة البيانات**: تسجل المبلغ الكامل (مثال: 5000$)
- **العرض المطلوب**: يجب أن يظهر المبلغ الصافي (4950$ = 5000$ - 50$ عمولة)

## الحل

### 1. دالة مساعدة لحساب المبلغ المعروض

```typescript
/**
 * حساب المبلغ المعروض للمستخدم في قائمة الحركات وكشف الحساب
 *
 * المنطق:
 * - outgoing مع عمولة لصالح المُحوِّل: amount - commission
 * - incoming مع عمولة لصالح المستلم: amount (مسجل مباشرة amount + commission)
 * - جميع الحالات الأخرى: amount
 */
export function getDisplayAmount(movement: AccountMovement): number {
  const baseAmount = Number(movement.amount);
  const commission = movement.commission ? Number(movement.commission) : 0;

  // تجاهل حركات العمولة المنفصلة
  if ((movement as any).is_commission_movement) {
    return baseAmount;
  }

  // outgoing مع عمولة لصالح المُحوِّل
  if (
    movement.movement_type === 'outgoing' &&
    commission > 0 &&
    movement.commission_recipient_id === movement.from_customer_id
  ) {
    return baseAmount - commission;
  }

  // في جميع الحالات الأخرى
  return baseAmount;
}
```

### 2. التطبيق في customer-details.tsx

استبدل:
```typescript
{Math.round(Number(movement.amount))}
```

بـ:
```typescript
{Math.round(getDisplayAmount(movement))}
```

### 3. التطبيق في accountStatementGenerator.ts

استبدل دالة `getCombinedAmount` بـ `getDisplayAmount`:

```typescript
import { getDisplayAmount } from './movementHelper'; // ملف جديد

// استخدام في الحسابات
const totalOutgoing = currMovements
  .filter(m => m.movement_type === 'outgoing')
  .reduce((sum, m) => sum + getDisplayAmount(m), 0);
```

## مثال توضيحي

### السيناريو
- جلال لديه رصيد: 5000$
- يحول 5000$ لعماد
- عمولة 50$ لصالح جلال

### قاعدة البيانات
1. جلال incoming: +5000$ (رصيد أولي)
2. جلال outgoing: -5000$ (التحويل - المبلغ الكامل)
3. جلال incoming: +50$ (عمولة)
4. عماد incoming: +5000$
5. الأرباح outgoing: -50$

الرصيد النهائي لجلال: 5000 - 5000 + 50 = **50$** ✓

### قائمة الحركات (المعروض للمستخدم)
1. جلال incoming: 5000$ (رصيد أولي)
2. جلال outgoing: **4950$** (المبلغ الصافي = 5000 - 50)
3. جلال incoming: 50$ (عمولة)
4. عماد incoming: 5000$

### كشف الحساب PDF
نفس قائمة الحركات أعلاه ✓

## ملاحظات مهمة

1. **الأرصدة صحيحة**: التعديل لا يؤثر على الأرصدة في قاعدة البيانات
2. **العرض فقط**: التعديل خاص بطبقة العرض (UI) فقط
3. **التوافق**: يعمل مع جميع أنواع التحويلات (عميل→عميل، عميل→محل، محل→عميل)
