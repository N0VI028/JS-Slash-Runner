import type { ScriptTree } from '@/type/scripts';
import { klona } from 'klona';

export const MAX_UID = 1_000_000;
export const DUMMY_NAME = '酒馆助手绑定数据（勿删）';
type Entry = Record<string, any>;
type WorldbookData = { entries?: Record<string, any>; [key: string]: any };

function mergeMetadata(...objects: any[]): any {
  const result: Record<string, any> = {};
  for (const object of objects) {
    for (const [key, value] of Object.entries(object ?? {})) {
      result[key] =
        value && typeof value === 'object' && !Array.isArray(value) ? mergeMetadata(result[key], value) : value;
    }
  }
  return result;
}

function signature(value: any): string {
  if (Array.isArray(value)) return `[${value.map(signature).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.keys(value)
      .sort()
      .map(key => `${JSON.stringify(key)}:${signature(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function mergeScripts(trees: ScriptTree[]): ScriptTree[] {
  const sanitize = (nodes: unknown): ScriptTree[] => {
    if (!Array.isArray(nodes)) return [];
    return nodes.flatMap(node => {
      if (!node || typeof node !== 'object' || Array.isArray(node) || typeof node.id !== 'string') return [];
      if (node.type === 'script') return [{ ...node } as ScriptTree];
      if (node.type === 'folder') return [{ ...node, scripts: sanitize(node.scripts) } as ScriptTree];
      return [];
    });
  };
  trees = sanitize(trees);
  const seen = new Map<string, string[]>();
  const used = new Set<string>();
  const reserve = (nodes: ScriptTree[]) =>
    nodes.forEach(node => {
      used.add(node.id);
      if (node.type === 'folder') reserve(node.scripts);
    });
  reserve(trees);
  let serial = 0;
  const visit = (nodes: ScriptTree[]): ScriptTree[] =>
    nodes.flatMap(node => {
      const fingerprint = signature(node);
      const versions = seen.get(node.id) ?? [];
      if (versions.includes(fingerprint)) return [];
      seen.set(node.id, [...versions, fingerprint]);
      let id = node.id;
      if (versions.length) {
        do {
          id = `${node.id}-recovered-${++serial}`;
        } while (used.has(id));
        used.add(id);
      }
      return [{ ...node, id, ...(node.type === 'folder' ? { scripts: visit(node.scripts) } : {}) } as ScriptTree];
    });
  return visit(trees);
}

/** Normalize in place; all ordinary entries retain their data, including reserved-uid collisions. */
export function normalizeWorldbookScriptData<T extends WorldbookData>(data: T): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const entries = Object.values(data.entries ?? {}).filter(
    entry => entry && typeof entry === 'object' && !Array.isArray(entry),
  ) as Entry[];
  const dummies = entries.filter(entry => entry.comment === DUMMY_NAME);
  const scripts = mergeScripts(
    dummies.flatMap(entry =>
      Array.isArray(entry.extra?.tavern_helper?.scripts) ? entry.extra.tavern_helper.scripts : [],
    ),
  );
  const ordinary = entries.filter(entry => entry.comment !== DUMMY_NAME);
  const used = new Set(
    ordinary.map(entry => entry.uid).filter(uid => Number.isInteger(uid) && uid >= 0 && uid < MAX_UID),
  );
  const assigned = new Set<number>();
  let next = 0;
  const result: Record<string, Entry> = {};
  for (const entry of ordinary) {
    let uid = entry.uid;
    if (!Number.isInteger(uid) || uid < 0 || uid >= MAX_UID || assigned.has(uid)) {
      while (used.has(next) || assigned.has(next)) ++next;
      if (next >= MAX_UID) throw Error('无法找到可用的世界书条目 uid');
      uid = next++;
    }
    assigned.add(uid);
    result[uid] = { ...entry, uid };
  }
  if (scripts.length) {
    const extra = mergeMetadata(...dummies.map(entry => entry.extra));
    extra.tavern_helper = { ...extra.tavern_helper, scripts };
    result[MAX_UID] = {
      key: [],
      keysecondary: [],
      constant: false,
      selective: false,
      selectiveLogic: 0,
      position: 0,
      role: 0,
      depth: 4,
      probability: 100,
      useProbability: true,
      ...Object.assign({}, ...dummies),
      extra,
      uid: MAX_UID,
      order: MAX_UID,
      displayIndex: MAX_UID,
      comment: DUMMY_NAME,
      disable: true,
      content: '',
    };
  }
  data.entries = result;
  return data;
}

export function getWorldbookScripts(data: WorldbookData): ScriptTree[] {
  normalizeWorldbookScriptData(data);
  return data?.entries?.[MAX_UID]?.extra?.tavern_helper?.scripts ?? [];
}

export function setWorldbookScripts<T extends WorldbookData>(data: T, scripts: ScriptTree[]): T {
  normalizeWorldbookScriptData(data);
  const entry = data.entries?.[MAX_UID] ?? { comment: DUMMY_NAME };
  data.entries![MAX_UID] = {
    ...entry,
    extra: { ...entry.extra, tavern_helper: { ...entry.extra?.tavern_helper, scripts } },
  };
  return normalizeWorldbookScriptData(data);
}

/** Preserve hidden bindings and unrepresented metadata, but honor explicit API script edits. */
export function preserveWorldbookScriptData<T extends WorldbookData>(data: T, previous: WorldbookData): T {
  previous = normalizeWorldbookScriptData(klona(previous));
  const incoming = Object.values(data.entries ?? {}) as Entry[];
  for (const entry of incoming) {
    const old = previous.entries?.[entry.comment === DUMMY_NAME ? MAX_UID : entry.uid];
    if (old && (old.comment === DUMMY_NAME) === (entry.comment === DUMMY_NAME)) {
      // Keep host fields that the public entry representation does not expose.
      for (const [key, value] of Object.entries(old)) {
        if (!(key in entry)) entry[key] = value;
      }
      entry.extra = mergeMetadata(old.extra, entry.extra);
    }
  }
  if (!incoming.some(entry => entry.comment === DUMMY_NAME)) {
    const dummy = previous.entries?.[MAX_UID];
    if (dummy) data.entries!.__scripts = dummy;
  }
  return normalizeWorldbookScriptData(data);
}
