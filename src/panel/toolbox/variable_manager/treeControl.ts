import type { InjectionKey, Ref } from 'vue';

/** 提供给树形组件使用的全局折叠控制上下文 */
export interface TreeControlContext {
  collapseAllSignal: Ref<number>;
  expandAllSignal: Ref<number>;
  lastAction: Ref<'collapse' | 'expand' | null>;
}

export const treeControlKey: InjectionKey<TreeControlContext> = Symbol('TreeControlContext');
