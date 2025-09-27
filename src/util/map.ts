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
