import { getVariables, replaceVariables } from '@/function/variables';

(globalThis as unknown as { TavernHelper: Record<string, any> }).TavernHelper = {
  getVariables,
  replaceVariables,
};
