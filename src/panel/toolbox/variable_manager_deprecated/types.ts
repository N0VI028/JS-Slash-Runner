import type { InjectionKey, Ref } from 'vue';

export const rootVariableTypes = ['string', 'number', 'boolean', 'array', 'object', 'null'] as const;
export type RootVariableType = (typeof rootVariableTypes)[number];

export const rootVariableKeySchema = z.string().trim().min(1, '键名不能为空');

export interface RootVariablePayload {
  key: string;
  type: RootVariableType;
  value: unknown;
}

/** 树形选择上下文接口 */
export interface TreeSelectionContext {
  /** 当前选中的路径，按层级顺序保存键或索引 */
  selectedPath: Ref<(string | number)[] | null>;
  /** 供面包屑展示使用的路径片段（字符串形式） */
  selectedSegments: Ref<string[]>;
  /** 当前选中节点对应的 JavaScript 访问路径 */
  selectedJsPath: Ref<string>;
  /** 触发路径选中 */
  selectPath: (path: (string | number)[]) => void;
}

export const treeSelectionKey: InjectionKey<TreeSelectionContext> = Symbol('TreeSelectionContext');

/** 提供给树形组件使用的全局折叠控制上下文 */
export interface TreeControlContext {
  collapseAllSignal: Ref<number>;
  expandAllSignal: Ref<number>;
  lastAction: Ref<'collapse' | 'expand' | null>;
}

export const treeControlKey: InjectionKey<TreeControlContext> = Symbol('TreeControlContext');
