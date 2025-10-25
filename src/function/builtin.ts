import { reloadEditor, reloadEditorDebounced } from '@/util/compatibility';
import {
  getImageTokenCost,
  getVideoTokenCost,
  reloadAndRenderChatWithoutEvents,
  reloadChatWithoutEvents,
  renderMarkdown,
} from '@/util/tavern';
import { addOneMessage, is_send_press, saveSettings } from '@sillytavern/script';
import { promptManager } from '@sillytavern/scripts/openai';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const builtin = {
  addOneMessage,
  duringGenerating: () => is_send_press,
  getImageTokenCost,
  getVideoTokenCost,
  promptManager,
  reloadAndRenderChatWithoutEvents,
  reloadChatWithoutEvents,
  reloadEditor,
  reloadEditorDebounced,
  renderMarkdown,
  renderPromptManager: promptManager.render,
  renderPromptManagerDebounced: promptManager.renderDebounced,
  saveSettings,
  uuidv4,
};
