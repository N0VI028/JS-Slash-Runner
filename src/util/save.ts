import { saveChatConditional } from '@sillytavern/script';

export const saveChatConditionalDebounced = _.debounce(saveChatConditional, 1000);
