import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Script } from '../schemas/script.schema';

export const useEditorStore = defineStore('editor', () => {
  // ===== State =====

  /**
   * 当前编辑的脚本ID
   */
  const currentScriptId = ref<string | null>(null);

  /**
   * 编辑器内容（可能与原始内容不同）
   */
  const content = ref<string>('');

  /**
   * 是否有未保存的更改
   */
  const isDirty = ref<boolean>(false);

  /**
   * 是否正在保存
   */
  const isSaving = ref<boolean>(false);

  /**
   * 编辑器配置
   */
  const config = ref({
    theme: 'vs-dark',
    language: 'javascript',
    fontSize: 14,
    wordWrap: 'on' as const,
    minimap: { enabled: true },
    autoSave: false,
    autoSaveDelay: 2000, // ms
  });

  /**
   * 光标位置信息
   */
  const cursorPosition = ref({
    line: 1,
    column: 1,
  });

  /**
   * 最后保存的时间
   */
  const lastSaved = ref<Date | null>(null);

  // ===== Getters =====

  /**
   * 是否有脚本正在编辑
   */
  const hasActiveScript = computed(() => currentScriptId.value !== null);

  /**
   * 编辑状态摘要
   */
  const editorStatus = computed(() => {
    if (!hasActiveScript.value) {
      return '未选择脚本';
    }

    if (isSaving.value) {
      return '保存中...';
    }

    if (isDirty.value) {
      return '有未保存的更改';
    }

    return lastSaved.value ? `最后保存: ${lastSaved.value.toLocaleTimeString()}` : '已保存';
  });

  // ===== Actions =====

  /**
   * 选择要编辑的脚本
   */
  function selectScript(script: Script): void {
    // 如果有未保存的更改，应该先提示用户
    if (isDirty.value && currentScriptId.value !== script.id) {
      // TODO: 显示确认对话框
      console.warn('有未保存的更改，将丢失');
    }

    currentScriptId.value = script.id;
    content.value = script.content;
    isDirty.value = false;
    lastSaved.value = null;
  }

  /**
   * 更新编辑器内容
   */
  function setContent(newContent: string): void {
    if (content.value !== newContent) {
      content.value = newContent;
      markDirty(true);
    }
  }

  /**
   * 标记脏状态
   */
  function markDirty(dirty: boolean): void {
    isDirty.value = dirty;
  }

  /**
   * 保存当前脚本
   */
  async function save(): Promise<void> {
    if (!currentScriptId.value) {
      throw new Error('没有选择要保存的脚本');
    }

    if (!isDirty.value) {
      return; // 没有更改，无需保存
    }

    isSaving.value = true;

    try {
      // 通过 repository service 保存
      const { repositoryService } = await import('../services/repository.service');

      // 获取当前脚本信息
      const { useScriptRepoStore } = await import('./scriptRepo.store');
      const scriptStore = useScriptRepoStore();
      const currentScript = scriptStore.scripts.get(currentScriptId.value);

      if (!currentScript) {
        throw new Error('当前脚本不存在');
      }

      // 更新脚本内容
      const updatedScript = {
        ...currentScript,
        content: content.value,
      };

      await repositoryService.saveScript(updatedScript);

      // 同步更新 store 中的脚本
      scriptStore.scripts.set(currentScriptId.value, updatedScript);

      isDirty.value = false;
      lastSaved.value = new Date();

      console.log('[EditorStore] 脚本保存成功:', currentScript.name);
    } catch (err) {
      console.error('保存失败:', err);
      throw err;
    } finally {
      isSaving.value = false;
    }
  }

  /**
   * 清空编辑器
   */
  function clear(): void {
    currentScriptId.value = null;
    content.value = '';
    isDirty.value = false;
    lastSaved.value = null;
    cursorPosition.value = { line: 1, column: 1 };
  }

  /**
   * 更新编辑器配置
   */
  function updateConfig(newConfig: Partial<typeof config.value>): void {
    config.value = { ...config.value, ...newConfig };
  }

  /**
   * 更新光标位置
   */
  function updateCursorPosition(line: number, column: number): void {
    cursorPosition.value = { line, column };
  }

  /**
   * 格式化代码
   */
  function formatCode(): void {
    if (!content.value) return;

    try {
      // TODO: 实现代码格式化逻辑
      // 可以使用 prettier 或其他格式化工具
      console.log('格式化代码');
      markDirty(true);
    } catch (err) {
      console.error('格式化失败:', err);
    }
  }

  /**
   * 插入文本到光标位置
   */
  function insertText(text: string): void {
    if (!hasActiveScript.value) return;

    // TODO: 实现在光标位置插入文本的逻辑
    // 这需要与编辑器组件配合
    content.value += text;
    markDirty(true);
  }

  return {
    // State
    currentScriptId,
    content,
    isDirty,
    isSaving,
    config,
    cursorPosition,
    lastSaved,

    // Getters
    hasActiveScript,
    editorStatus,

    // Actions
    selectScript,
    setContent,
    markDirty,
    save,
    clear,
    updateConfig,
    updateCursorPosition,
    formatCode,
    insertText,
  };
});
