import { getVariables } from './variables.js';

(globalThis as unknown as { TavernHelper: Record<string, any> }).TavernHelper = {
  getVariables,
  replaceVariables,
};
