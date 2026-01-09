import { AccountMovement } from '@/types/database';

export function getDisplayAmount(movement: AccountMovement): number {
  const baseAmount = Number(movement.amount);

  if ((movement as any).is_commission_movement) {
    return baseAmount;
  }

  return baseAmount;
}
