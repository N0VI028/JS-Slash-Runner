// 导出所有类型定义

import {
  CreateFolderPayload,
  CreateScriptPayload,
  MoveScriptPayload,
  RenameFolderPayload,
  SearchFilters,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';

// Schema 类型
export type { Folder, Repository, Script, ScriptRepositoryItem, ScriptType } from '../schemas/script.schema';

export type {
  CreateFolderPayload,
  CreateScriptPayload,
  DeletePayload,
  ExportScriptPayload,
  ImportScriptPayload,
  MoveFolderPayload,
  MoveScriptPayload,
  RenameFolderPayload,
  SearchFilters,
  SortOptions,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';

// Store 相关类型
export type { DialogConfig, LoadingState, ToastMessage } from '../stores/ui.store';

// 额外的工具类型

/**
 * 脚本操作类型
 */
export type ScriptAction = 'create' | 'update' | 'delete' | 'move' | 'toggle' | 'run' | 'stop';

/**
 * 文件夹操作类型
 */
export type FolderAction = 'create' | 'rename' | 'delete' | 'move' | 'expand' | 'collapse';

/**
 * 排序字段类型
 */
export type SortField = 'name' | 'created' | 'modified' | 'enabled';

/**
 * 排序方向类型
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 视图模式类型
 */
export type ViewMode = 'list' | 'grid' | 'tree';

/**
 * 操作结果类型
 */
export interface OperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

/**
 * 异步操作状态
 */
export type AsyncOperationStatus = 'idle' | 'pending' | 'success' | 'error';

/**
 * 脚本执行状态
 */
export type ScriptExecutionStatus = 'idle' | 'running' | 'completed' | 'error' | 'stopped';

/**
 * 编辑器配置类型
 */
export interface EditorConfig {
  theme: string;
  language: string;
  fontSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: { enabled: boolean };
  autoSave: boolean;
  autoSaveDelay: number;
}

/**
 * 光标位置类型
 */
export interface CursorPosition {
  line: number;
  column: number;
}

/**
 * 文件夹树节点类型
 */
export interface FolderTreeNode {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string;
  color?: string;
  expanded: boolean;
  scripts: string[];
  children?: FolderTreeNode[];
  level: number;
  hasChildren: boolean;
}

/**
 * 搜索高亮信息
 */
export interface SearchHighlight {
  field: 'name' | 'content' | 'info';
  start: number;
  end: number;
  text: string;
}

/**
 * 脚本验证结果
 */
export interface ScriptValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * 导入导出格式
 */
export type ImportExportFormat = 'json' | 'zip' | 'csv';

/**
 * 权限类型
 */
export interface Permission {
  read: boolean;
  write: boolean;
  execute: boolean;
  delete: boolean;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  viewMode: ViewMode;
  sortOptions: {
    field: SortField;
    order: SortOrder;
  };
  editorConfig: EditorConfig;
  autoSave: boolean;
  confirmDelete: boolean;
  showLineNumbers: boolean;
  foldersExpanded: string[];
}

/**
 * 组件事件类型定义
 */
export interface ComponentEvents {
  // 脚本事件
  'script:select': [id: string];
  'script:create': [payload: CreateScriptPayload];
  'script:update': [payload: UpdateScriptPayload];
  'script:delete': [id: string];
  'script:move': [payload: MoveScriptPayload];
  'script:toggle': [id: string];
  'script:run': [id: string];
  'script:stop': [id: string];

  // 文件夹事件
  'folder:select': [id: string];
  'folder:create': [payload: CreateFolderPayload];
  'folder:rename': [payload: RenameFolderPayload];
  'folder:delete': [id: string];
  'folder:expand': [id: string];
  'folder:collapse': [id: string];

  // 编辑器事件
  'editor:content-change': [content: string];
  'editor:save': [];
  'editor:dirty': [isDirty: boolean];

  // 搜索事件
  'search:change': [keyword: string];
  'filter:change': [filters: Partial<SearchFilters>];
  'sort:change': [options: { field: SortField; order: SortOrder }];
}

/**
 * 服务接口基类
 */
export interface ServiceInterface {
  initialized: boolean;
  initialize(): Promise<void>;
  destroy(): Promise<void>;
}
