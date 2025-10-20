import { reloadEditor, reloadEditorDebounced } from '@/util/compatibility';
import { reloadAndRenderChatWithoutEvents, reloadChatWithoutEvents } from '@/util/tavern';
import { addOneMessage, saveSettings } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';

export const builtin = {
  addOneMessage,
  saveSettings,
  promptManager,
  reloadEditor,
  reloadEditorDebounced,
  renderPromptManager: promptManager.render,
  renderPromptManagerDebounced: promptManager.renderDebounced,
  reloadChatWithoutEvents,
  reloadAndRenderChatWithoutEvents,
};
