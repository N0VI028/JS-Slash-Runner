/**
 * 带回退验证的 tab 状态管理
 * 当存储的 tab 值无效时自动回退到第一个 tab
 */
export function useValidatedTab<T extends string | number>(
  storageKey: string,
  defaultValue: T,
  getValidValues: () => T[],
): Ref<T> {
  const stored = useLocalStorage<T>(storageKey, defaultValue);

  const validated = computed({
    get: () => {
      const validValues = getValidValues();
      if (validValues.includes(stored.value)) {
        return stored.value;
      }
      // 回退到第一个有效值
      return validValues[0] ?? defaultValue;
    },
    set: (value: T) => {
      stored.value = value;
    },
  });

  // 如果初始值无效，立即修正存储值
  const validValues = getValidValues();
  if (!validValues.includes(stored.value) && validValues.length > 0) {
    stored.value = validValues[0];
  }

  return validated;
}
