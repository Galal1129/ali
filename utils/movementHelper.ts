import { AccountMovement } from '@/types/database';

export function getDisplayAmount(movement: AccountMovement): number {
  if ((movement as any).is_commission_movement) {
    return Number(movement.amount) || 0;
  }

  return Number(movement.amount) || 0;
}
