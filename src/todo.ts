import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { marked } from 'marked';

export function make_TODO(markdown_hint: string) {
  return () => callGenericPopup(marked.parse(markdown_hint, { async: false }), POPUP_TYPE.TEXT);
}
