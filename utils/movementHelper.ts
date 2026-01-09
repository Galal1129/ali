import { AccountMovement } from '@/types/database';

export function getDisplayAmount(movement: AccountMovement): number {
  const amount = Number(movement.amount) || 0;
  const commission = Number((movement as any).commission) || 0;
  const originalAmount =
    (movement as any).original_amount != null ? Number((movement as any).original_amount) : null;

  // Commission movement rows (P&L) are displayed as-is
  if ((movement as any).is_commission_movement) return amount;

  // Internal transfers: assume DB already stored the effective amount for each side
  if ((movement as any).transfer_direction) return amount;

  // ✅ IMPORTANT:
  // If original_amount exists but amount is still equal to original_amount,
  // then we must compute the effective amount using commission.
  if (originalAmount !== null && commission > 0 && amount === originalAmount) {
    // For normal customer accounting in your app:
    // movement_type === 'incoming' => Payment to customer => effective = original + commission
    // movement_type === 'outgoing' => Receipt from customer => effective = original - commission
    return movement.movement_type === 'incoming'
      ? originalAmount + commission
      : originalAmount - commission;
  }

  // If original_amount exists and amount is already adjusted, trust amount
  if (originalAmount !== null) return amount;

  // Legacy rows (no original_amount)
  if (commission > 0) {
    return movement.movement_type === 'incoming' ? amount + commission : amount - commission;
  }

  return amount;
}
