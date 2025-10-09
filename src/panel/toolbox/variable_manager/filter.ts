export type FilterType = 'string' | 'number' | 'array' | 'boolean' | 'object';

export type FiltersState = Record<FilterType, boolean>;

export const createDefaultFilters = (): FiltersState => ({
  string: true,
  number: true,
  array: true,
  boolean: true,
  object: true,
});

/**
 * 识别值对应的筛选类型
 */
export const getFilterType = (value: unknown): FilterType | null => {
  if (Array.isArray(value)) return 'array';
  if (value === null || value === undefined) return 'object';
  const type = typeof value;
  if (type === 'string') return 'string';
  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';
  return null;
};

/**
 * 判断指定值或其子节点是否满足筛选条件
 */
export const matchesFilters = (
  value: unknown,
  filters: FiltersState,
  depth = 0,
  visited: WeakSet<object> = new WeakSet<object>(),
): boolean => {
  const type = getFilterType(value);
  if (!type) return false;

  if (type === 'array') {
    if (typeof value === 'object' && value !== null) {
      if (visited.has(value as object)) return false;
      visited.add(value as object);
    }
    const arrayValue = Array.isArray(value) ? value : [];
    const childMatched = arrayValue.some(item => matchesFilters(item, filters, depth + 1, visited));
    if (!filters.array) {
      return depth === 0 ? childMatched : false;
    }
    return arrayValue.length === 0 ? true : childMatched || filters.array;
  }

  if (type === 'object') {
    if (typeof value === 'object' && value !== null) {
      if (visited.has(value as object)) return false;
      visited.add(value as object);
    }
    const values = typeof value === 'object' && value !== null ? Object.values(value as Record<string, unknown>) : [];
    const childMatched = values.some(item => matchesFilters(item, filters, depth + 1, visited));
    if (!filters.object) {
      return depth === 0;
    }
    return values.length === 0 ? true : childMatched || filters.object;
  }

  return filters[type];
};
