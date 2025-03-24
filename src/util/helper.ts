import { SetMultimap } from '@/util/multimap';

export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  return array.reduce(
    ([pass, fail], item) => {
      if (predicate(item)) {
        pass.push(item);
      } else {
        fail.push(item);
      }
      return [pass, fail];
    },
    [[], []] as [T[], T[]],
  );
}

export function set_or_add<K1, K2, V>(map: Map<K1, SetMultimap<K2, V>>, k1: K1, k2: K2, v: V): boolean {
  if (map.has(k1)) {
    // @ts-ignore 2532
    map.get(k1).put(k2, v);
    return false;
  }

  map.set(k1, new SetMultimap([[k2, v]]));
  return true;
}

export function try_set<K, V>(map: Map<K, V>, key: K, value: V): boolean {
  if (map.has(key)) {
    return false;
  }
  map.set(key, value);
  return true;
}

export function get_or_set<K, V>(map: Map<K, V>, key: K, defaulter: () => V): V {
  const existing_value = map.get(key);
  if (existing_value) {
    return existing_value;
  }
  const default_value = defaulter();
  map.set(key, default_value);
  return default_value;
}

export function extract<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key);
  if (!value) {
    return undefined;
  }
  map.delete(key);
  return value;
}

export function with_fallback<T extends Object>(data: Partial<T>, fallback: T): T {
  const result = { ...fallback };
  for (const key in data) {
    if (data[key] !== undefined) {
      result[key] = data[key];
    }
  }
  return result;
}
