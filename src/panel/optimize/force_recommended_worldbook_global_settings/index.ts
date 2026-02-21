import { setLorebookSettings } from '@/function/lorebook';
import { event_types, eventSource } from '@sillytavern/script';

function sync_lorebook_settings() {
  const EXPECTED_SETTINGS: Record<string, any> = {
    scan_depth: 2,
    context_percentage: 100,
    budget_cap: 0,
    min_activations: 0,
    max_depth: 0,
    max_recursion_steps: 0,

    insertion_strategy: 'character_first',

    include_names: false,
    recursive: true,
    case_sensitive: false,
    match_whole_words: false,
    use_group_scoring: false,
    overflow_alert: false,
  };
  setLorebookSettings(EXPECTED_SETTINGS);
}

export function useForceRecommendedWorldbookGlobalSettings(enabled: Readonly<Ref<boolean>>) {
  eventSource.once(event_types.SETTINGS_UPDATED, () => {
    watchImmediate(enabled, new_enabled => {
      if (new_enabled) {
        sync_lorebook_settings();
      }
    });
  });
}
