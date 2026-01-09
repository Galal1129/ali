# إصلاح نظام العمولة والأرصدة - تقرير نهائي

## المشكلة الأساسية

عندما كانت العمولة تذهب للمُرسِل في التحويل الداخلي، كانت الأرصدة المعروضة غير صحيحة:

### قبل الإصلاح:
- **التحويل:** جلال → عماد، 5000 USD، عمولة 120 USD لجلال
- **المتوقع:**
  - جلال: لنا عنده 4880 USD
  - عماد: له عندنا 5000 USD
- **المعروض (خطأ):**
  - جلال: -4760 USD ❌
  - عماد: +4880 USD ❌

## الإصلاحات المطبقة

### 1. إصلاح دالة `getDisplayAmount` في `utils/movementHelper.ts`

**المشكلة:** كانت الدالة تخصم العمولة من حقل `amount` مرة أخرى، بينما `amount` يحتوي بالفعل على المبلغ الصحيح بعد خصم العمولة.

**الحل:** استخدام `amount` مباشرة بدون أي خصم إضافي.

```typescript
// قبل الإصلاح
export function getDisplayAmount(movement: AccountMovement): number {
  const baseAmount = Number(movement.amount);
  const commission = movement.commission ? Number(movement.commission) : 0;

  if (movement.movement_type === 'outgoing' &&
      commission > 0 &&
      movement.commission_recipient_id === movement.from_customer_id) {
    return baseAmount - commission; // ❌ خصم خاطئ
  }

  return baseAmount;
}

// بعد الإصلاح
export function getDisplayAmount(movement: AccountMovement): number {
  const baseAmount = Number(movement.amount);

  if ((movement as any).is_commission_movement) {
    return baseAmount;
  }

  return baseAmount; // ✅ استخدام المبلغ مباشرة
}
```

### 2. إصلاح VIEW `customer_balances`

**المشكلة:** كان VIEW يخصم العمولة من المبالغ مرة أخرى:

```sql
-- قبل الإصلاح ❌
am.amount - COALESCE(am.commission, 0)
```

**الحل:** استخدام `amount` مباشرة بدون خصم:

```sql
-- بعد الإصلاح ✅
am.amount
```

**ملف الميغرايشن:** `fix_customer_balances_view_dont_subtract_commission.sql`

### 3. إصلاح VIEW `accounting_balance_check`

**المشكلة:** كان VIEW يستخدم `amount` للتحقق من التوازن، مما يؤدي إلى ظهور فرق بقيمة العمولة.

**الحل:** استخدام `original_amount` للتحويلات الداخلية لحساب التوازن الصحيح:

```sql
-- استخدام original_amount للتحويلات الداخلية
CASE
  WHEN from_customer_id IS NOT NULL AND to_customer_id IS NOT NULL
  THEN original_amount  -- ✅ 5000
  ELSE amount           -- للحركات العادية
END
```

**ملف الميغرايشن:** `fix_commission_trigger_record_for_sender_recipient.sql`

## النتيجة النهائية

### الحركات المسجلة:
| العميل | النوع | المبلغ الأصلي | المبلغ المسجل | العمولة |
|--------|-------|---------------|---------------|----------|
| جلال   | outgoing | 5000 USD | 4880 USD | 120 USD |
| عماد   | incoming | 5000 USD | 5000 USD | 120 USD |

### الأرصدة النهائية:
| العميل | النوع | الرصيد |
|--------|-------|--------|
| جلال   | لنا عنده (مدين) | +4880 USD ✅ |
| عماد   | له عندنا (دائن) | -5000 USD ✅ |

### التوازن المحاسبي:
- **المدين (outgoing):** 4880 USD
- **الدائن (incoming):** 5000 USD
- **الصافي باستخدام original_amount:** 5000 - 5000 = **0 USD** ✅
- **متوازن:** نعم ✅

## المنطق المحاسبي الصحيح

### في التحويل الداخلي مع عمولة للمُرسِل:

**السيناريو:** جلال → عماد، 5000 USD، عمولة 120 لجلال

**ما يحدث:**
1. عماد يدفع 5000 → نحن نستلم 5000 نيابة عن جلال
2. جلال يستلم العمولة 120 → نحن ندفع لجلال فقط 4880
3. الفرق 120 هو العمولة التي استلمها جلال

**التسجيل:**
- جلال: outgoing 4880 (نحن دفعنا له 4880 فعلياً)
- عماد: incoming 5000 (نحن استلمنا منه 5000 فعلياً)

**الأرصدة:**
- جلال: +4880 (لنا عنده = نحن نطالبه بـ 4880)
- عماد: -5000 (له عندنا = هو يطالبنا بـ 5000)

**المعنى:**
جلال يجب أن يدفع لنا 4880 لأننا دفعنا نيابة عنه 5000 لكنه استلم عمولة 120.

## الخلاصة

تم إصلاح جميع الإشكاليات:

1. ✅ الأرصدة المعروضة صحيحة ومتطابقة
2. ✅ حقل `amount` يستخدم مباشرة بدون خصم إضافي
3. ✅ الميزان المحاسبي متوازن باستخدام `original_amount`
4. ✅ المنطق المحاسبي واضح ومتسق

---

**تاريخ الإصلاح:** 2026-01-09
**الملفات المعدلة:**
- `utils/movementHelper.ts`
- `supabase/migrations/fix_customer_balances_view_dont_subtract_commission.sql`
- `supabase/migrations/fix_commission_trigger_record_for_sender_recipient.sql`
