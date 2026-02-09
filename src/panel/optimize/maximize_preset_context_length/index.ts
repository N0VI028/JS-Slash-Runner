import { event_types, eventSource } from '@sillytavern/script';
import { oai_settings } from '@sillytavern/scripts/openai';

export function useMaximizePresetContextLength(enabled: Readonly<Ref<boolean>>) {
  function unlock_token_length() {
    const MAX_CONTEXT = 2000000;
    if (oai_settings.max_context_unlocked === true && oai_settings.openai_max_context === MAX_CONTEXT) {
      return;
    }

    $('#oai_max_context_unlocked').prop('checked', true).trigger('input');
    $('#openai_max_context').attr('max', MAX_CONTEXT).val(MAX_CONTEXT).trigger('input');
    // 再通过 oai_settings 保证被设置
    oai_settings.max_context_unlocked = true;
    oai_settings.openai_max_context = MAX_CONTEXT;
  }

  eventSource.once('chatLoaded', () => {
    watchImmediate(enabled, new_enabled => {
      const $inputs = $('#oai_max_context_unlocked, #openai_max_context, #openai_max_context_counter');
      if (new_enabled && $inputs.length > 0) {
        unlock_token_length();
      }
    });
  });

  eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => {
    if (enabled.value) {
      unlock_token_length();
    }
  });
}
