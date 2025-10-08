import type { InjectionKey, Ref } from 'vue';

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

