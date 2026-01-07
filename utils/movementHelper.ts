import { AccountMovement } from '@/types/database';

export function getDisplayAmount(movement: AccountMovement): number {
  const baseAmount = Number(movement.amount);
  const commission = movement.commission ? Number(movement.commission) : 0;

  if ((movement as any).is_commission_movement) {
    return baseAmount;
  }

  if (
    movement.movement_type === 'outgoing' &&
    commission > 0 &&
    movement.commission_recipient_id === movement.from_customer_id
  ) {
    return baseAmount - commission;
  }

  return baseAmount;
}
