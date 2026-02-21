import { event_types, eventSource, saveSettingsDebounced } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';

interface ExpectedOption {
  setting: string;
  expected: boolean;
}

function toggleIfNotAllowed(option: ExpectedOption): boolean {
  if (_.get(power_user, option.setting) === option.expected) {
    return false;
  }

  _.set(power_user, option.setting, option.expected);
  $(`#${option.setting}`).prop('checked', option.expected);
  return true;
}

export function useDisableIncompatibleOption(enabled: Readonly<Ref<boolean>>) {
  eventSource.once(event_types.SETTINGS_UPDATED, () => {
    watchImmediate(enabled, new_enabled => {
      if (!new_enabled) {
        return;
      }

      if (
        [
          { setting: 'auto_fix_generated_markdown', expected: false },
          { setting: 'trim_sentences', expected: false },
          { setting: 'forbid_external_media', expected: false },
          { setting: 'encode_tags', expected: false },
          { setting: 'allow_name1_display', expected: true },
          { setting: 'allow_name2_display', expected: true },
        ]
          .map(option => toggleIfNotAllowed(option))
          .some(is_changed => !!is_changed)
      ) {
        saveSettingsDebounced();
      }
    });
  });
}
