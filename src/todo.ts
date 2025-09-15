import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { marked } from 'marked';

export function TODO_hint(markdown_hint: string) {
  return () => callGenericPopup(marked.parse(markdown_hint, { async: false }), POPUP_TYPE.TEXT);
}
