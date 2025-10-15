/**
 * 搜索工具函数：用于判断节点是否匹配搜索词，并在卡片模式中进行可见性判定。
 */

export type SearchQuery = string | RegExp | undefined | null;

/**
 * 判断当前是否处于搜索状态（有非空查询）
 */
export const isSearching = (q: SearchQuery): boolean => q !== '' && q !== undefined && q !== null;

/**
 * 文本匹配：
 * - 若 query 为正则，使用其 test
 * - 若 query 为字符串，进行不区分大小写的包含匹配
 */
export const textMatches = (text: string, query: string | RegExp): boolean => {
  if (query instanceof RegExp) {
    try {
      return query.test(text);
    } catch {
      return false;
    }
  }
  const q = String(query).toLowerCase();
  if (!q.length) return false;
  return text.toLowerCase().includes(q);
};

/**
 * 规范化原始值为可用于匹配的文本。
 */
const normalizePrimitive = (value: unknown): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return String(value);
  } catch {
    return '';
  }
};

/**
 * 递归判断值是否命中搜索词（检查字符串展示与子节点）。
 * - 对象：同时检查 key 文本与子值
 * - 数组：检查元素
 * - 原始类型：匹配其字符串表示
 */
export const valueMatchesSearch = (
  value: unknown,
  query: string | RegExp,
  visited: WeakSet<object> = new WeakSet<object>(),
): boolean => {
  if (value === null || value === undefined) {
    return textMatches(normalizePrimitive(value), query);
  }
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    return textMatches(normalizePrimitive(value), query);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (valueMatchesSearch(item, query, visited)) return true;
    }
    return false;
  }
  if (t === 'object') {
    const obj = value as Record<string, unknown>;
    if (visited.has(obj)) return false;
    visited.add(obj);
    for (const [k, v] of Object.entries(obj)) {
      if (textMatches(String(k), query)) return true;
      if (valueMatchesSearch(v, query, visited)) return true;
    }
    return false;
  }
  return false;
};

/**
 * 节点匹配：键名或值任一命中即视为匹配。
 */
export const nodeMatchesSearch = (
  name: string | number | undefined,
  value: unknown,
  query: string | RegExp,
): boolean => {
  if (name !== undefined) {
    if (textMatches(String(name), query)) return true;
  }
  return valueMatchesSearch(value, query);
};
