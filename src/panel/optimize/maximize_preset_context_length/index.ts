import { event_types, eventSource } from '@sillytavern/script';
import { oai_settings } from '@sillytavern/scripts/openai';

export function useMaximizePresetContextLength(enabled: Readonly<Ref<boolean>>) {
  function unlock_token_length() {
    const MAX_CONTEXT = 2000000;
    if (oai_settings.max_context_unlocked === true && oai_settings.openai_max_context === MAX_CONTEXT) {
      return;
    }

    $('#openai_max_context_counter').val(MAX_CONTEXT);
    $('#openai_max_context').val(MAX_CONTEXT).trigger('input');
    $('#oai_max_context_unlocked').prop('checked', true).trigger('input');
  }

  watchImmediate(enabled, new_enabled => {
    const $inputs = $('#oai_max_context_unlocked, #openai_max_context, #openai_max_context_counter');
    if (new_enabled && $inputs.length > 0) {
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
