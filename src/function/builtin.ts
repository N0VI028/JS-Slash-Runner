import { reloadEditor, reloadEditorDebounced } from '@/compatibility';
import { addOneMessage, saveSettings } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';

export const builtin = {
  addOneMessage,
  saveSettings,
  reloadEditor,
  reloadEditorDebounced,
  promptManager,
  renderPromptManager: promptManager.render,
  renderPromptManagerDebounced: promptManager.renderDebounced,
};
