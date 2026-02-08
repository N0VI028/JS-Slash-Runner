import { event_types, eventSource } from '@sillytavern/script';
import { openai_settings } from '@sillytavern/scripts/openai';

export function useMaximizePresetContextLength(enabled: Readonly<Ref<boolean>>) {
  function unlock_token_length() {
    const MAX_CONTEXT = 2000000;
    if (openai_settings.max_context_unlocked === true && openai_settings.openai_max_context === MAX_CONTEXT) {
      return;
    }

    $('#oai_max_context_unlocked').prop('checked', true).trigger('input');
    $('#openai_max_context_counter').val(MAX_CONTEXT);
    $('#openai_max_context').val(MAX_CONTEXT).trigger('input');
  }

  watchImmediate(enabled, new_enabled => {
    const $inputs = $('#oai_max_context_unlocked, #openai_max_context, #openai_max_context_counter');
    if (new_enabled) {
      unlock_token_length();
      $inputs.prop('disabled', true);
    } else {
      $inputs.prop('disabled', false);
    }
  });

  eventSource.on(event_types.OAI_PRESET_CHANGED_AFTER, () => {
    if (enabled.value) {
      unlock_token_length();
    }
  });
}
