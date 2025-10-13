export function trySet<K, V>(map: Map<K, V>, key: K, value: V): boolean {
  if (map.has(key)) {
    return false;
  }
  map.set(key, value);
  return true;
}

export function getOrSet<K, V>(map: Map<K, V>, key: K, defaulter: () => V): V {
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

export function assignInplace<T>(destination: T[], new_array: T[]): T[] {
  destination.length = 0;
  destination.push(...new_array);
  return destination;
}

export function chunkBy<T>(array: T[], predicate: (lhs: T, rhs: T) => boolean): T[][] {
  if (array.length === 0) {
    return [];
  }

  const chunks: T[][] = [[array[0]]];
  for (const [lhs, rhs] of _.zip(_.dropRight(array), _.drop(array))) {
    if (predicate(lhs!, rhs!)) {
      chunks[chunks.length - 1].push(rhs!);
    } else {
      chunks.push([rhs!]);
    }
  }
  return chunks;
}
