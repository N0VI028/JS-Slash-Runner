// 命名为 _multimap.ts, 保证它被插入在开头, 虽然最好换一种 iframe 内代码的做法
abstract class Multimap<K, V, I extends Iterable<V>>
  implements Iterable<[K, V]> {
  private size_ = 0;
  private map: Map<K, I> = new Map();
  private operator: CollectionOperator<V, I>;

  constructor(operator: CollectionOperator<V, I>, iterable?: Iterable<[K, V]>) {
    this.operator = operator;
    if (iterable) {
      for (const [key, value] of iterable) {
        this.put(key, value);
      }
    }
    return this;
  }

  abstract get [Symbol.toStringTag](): string;

  get size(): number {
    return this.size_;
  }

  get(key: K): I {
    const values = this.map.get(key);
    if (values) {
      return this.operator.clone(values);
    } else {
      return this.operator.create();
    }
  }

  put(key: K, value: V): boolean {
    let values = this.map.get(key);
    if (!values) {
      values = this.operator.create();
    }
    if (!this.operator.add(value, values)) {
      return false;
    }
    this.map.set(key, values);
    this.size_++;
    return true;
  }

  putAll(key: K, values: I): boolean;
  putAll(multimap: Multimap<K, V, I>): boolean;
  putAll(arg1: K | Multimap<K, V, I>, arg2?: I): boolean {
    let pushed = 0;
    if (arg2) {
      const key = arg1 as K;
      const values = arg2;
      for (const value of values) {
        this.put(key, value);
        pushed++;
      }
    } else if (arg1 instanceof Multimap) {
      for (const [key, value] of arg1.entries()) {
        this.put(key, value);
        pushed++;
      }
    } else {
      throw new TypeError("unexpected arguments");
    }
    return pushed > 0;
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  hasEntry(key: K, value: V): boolean {
    return this.operator.has(value, this.get(key));
  }

  delete(key: K): boolean {
    this.size_ -= this.operator.size(this.get(key));
    return this.map.delete(key);
  }

  deleteEntry(key: K, value: V): boolean {
    const current = this.get(key);
    if (!this.operator.delete(value, current)) {
      return false;
    }
    this.map.set(key, current);
    this.size_--;
    return true;
  }

  clear(): void {
    this.map.clear();
    this.size_ = 0;
  }

  keys(): IterableIterator<K> {
    return this.map.keys();
  }

  entries(): IterableIterator<[K, V]> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function* gen(): IterableIterator<[K, V]> {
      for (const [key, values] of self.map.entries()) {
        for (const value of values) {
          yield [key, value];
        }
      }
    }
    return gen();
  }

  values(): IterableIterator<V> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    function* gen(): IterableIterator<V> {
      for (const [, value] of self.entries()) {
        yield value;
      }
    }
    return gen();
  }

  forEach<T>(
    callback: (this: T | this, value: V, key: K, map: this) => void,
    thisArg?: T,
  ): void {
    for (const [key, value] of this.entries()) {
      callback.call(thisArg === undefined ? this : thisArg, value, key, this);
    }
  }

  [Symbol.iterator]() {
    return this.entries();
  }

  asMap(): Map<K, I> {
    const ret = new Map<K, I>();
    for (const key of this.keys()) {
      ret.set(key, this.operator.clone(this.get(key)));
    }
    return ret;
  }
}

interface CollectionOperator<V, I> {
  create(): I;
  clone(collection: I): I;
  add(value: V, collection: I): boolean;
  size(collection: I): number;
  delete(value: V, collection: I): boolean;
  has(value: V, collection: I): boolean;
}

class ArrayMultimap<K, V> extends Multimap<K, V, V[]> {
  constructor(iterable?: Iterable<[K, V]>) {
    super(new ArrayOperator(), iterable);
  }

  get [Symbol.toStringTag](): string {
    return "ArrayMultimap";
  }
}

class ArrayOperator<V> implements CollectionOperator<V, V[]> {
  create(): V[] {
    return [];
  }

  clone(collection: V[]): V[] {
    return collection.slice();
  }

  add(value: V, collection: V[]): boolean {
    collection.push(value);
    return true;
  }

  size(collection: V[]): number {
    return collection.length;
  }

  delete(value: V, collection: V[]): boolean {
    const index = collection.indexOf(value);
    if (index > -1) {
      collection.splice(index, 1);
      return true;
    }
    return false;
  }
  has(value: V, collection: V[]): boolean {
    return collection.includes(value);
  }
}

class SetMultimap<K, V> extends Multimap<K, V, Set<V>> {
  constructor(iterable?: Iterable<[K, V]>) {
    super(new SetOperator(), iterable);
  }
  get [Symbol.toStringTag](): string {
    return "SetMultimap";
  }
}

class SetOperator<V> implements CollectionOperator<V, Set<V>> {
  create(): Set<V> {
    return new Set();
  }
  clone(collection: Set<V>): Set<V> {
    return new Set(collection);
  }
  add(value: V, collection: Set<V>): boolean {
    const prev = collection.size;
    collection.add(value);
    return prev !== collection.size;
  }
  size(collection: Set<V>): number {
    return collection.size;
  }
  delete(value: V, collection: Set<V>): boolean {
    return collection.delete(value);
  }
  has(value: V, collection: Set<V>): boolean {
    return collection.has(value);
  }
}
