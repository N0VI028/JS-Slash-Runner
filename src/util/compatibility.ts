import { extension_prompt_roles, getRequestHeaders } from '@sillytavern/script';
import {
  DEFAULT_DEPTH,
  DEFAULT_WEIGHT,
  newWorldInfoEntryTemplate,
  selected_world_info,
  world_info_logic,
  world_info_position,
  world_names,
} from '@sillytavern/scripts/world-info';

export async function updateWorldInfoList() {
  const result = await fetch('/api/settings/get', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({}),
  });

  if (result.ok) {
    const data = await result.json();

    world_names.length = 0;
    world_names.push(...(data.world_names?.length ? data.world_names : []));
    $('#world_info').find('option[value!=""]').remove();
    $('#world_editor_select').find('option[value!=""]').remove();

    world_names.forEach((item, i) => {
      $('#world_info').append(
        `<option value='${i}'${selected_world_info.includes(item) ? ' selected' : ''}>${item}</option>`,
      );
      $('#world_editor_select').append(`<option value='${i}'>${item}</option>`);
    });
  }
}

export function fromCharacterBook(character_book: { entries: any[] }) {
  const result: { entries: Record<string, any> } = { entries: {} };

  character_book.entries.forEach((entry, index) => {
    // Not in the spec, but this is needed to find the entry in the original data
    if (entry.id === undefined) {
      entry.id = index;
    }

    result.entries[entry.id] = {
      ...newWorldInfoEntryTemplate,
      uid: entry.id,
      key: entry.keys,
      keysecondary: entry.secondary_keys || [],
      comment: entry.comment || '',
      content: entry.content,
      constant: entry.constant || false,
      selective: entry.selective || false,
      order: entry.insertion_order,
      position:
        entry.extensions?.position ??
        (entry.position === 'before_char' ? world_info_position.before : world_info_position.after),
      excludeRecursion: entry.extensions?.exclude_recursion ?? false,
      preventRecursion: entry.extensions?.prevent_recursion ?? false,
      delayUntilRecursion: entry.extensions?.delay_until_recursion ?? false,
      disable: !entry.enabled,
      addMemo: !!entry.comment,
      displayIndex: entry.extensions?.display_index ?? index,
      probability: entry.extensions?.probability ?? 100,
      useProbability: entry.extensions?.useProbability ?? true,
      depth: entry.extensions?.depth ?? DEFAULT_DEPTH,
      selectiveLogic: entry.extensions?.selectiveLogic ?? world_info_logic.AND_ANY,
      group: entry.extensions?.group ?? '',
      groupOverride: entry.extensions?.group_override ?? false,
      groupWeight: entry.extensions?.group_weight ?? DEFAULT_WEIGHT,
      scanDepth: entry.extensions?.scan_depth ?? null,
      caseSensitive: entry.extensions?.case_sensitive ?? null,
      matchWholeWords: entry.extensions?.match_whole_words ?? null,
      useGroupScoring: entry.extensions?.use_group_scoring ?? null,
      automationId: entry.extensions?.automation_id ?? '',
      role: entry.extensions?.role ?? extension_prompt_roles.SYSTEM,
      vectorized: entry.extensions?.vectorized ?? false,
      sticky: entry.extensions?.sticky ?? null,
      cooldown: entry.extensions?.cooldown ?? null,
      delay: entry.extensions?.delay ?? null,
      extensions: entry.extensions ?? {},
    };
  });

  return result;
}

/**
 * Reloads the editor with the specified world info file
 * @param file The file to load in the editor
 * @param loadIfNotSelected Indicates whether to load the file even if it's not currently selected
 */
export function reloadEditor(file: string, load_if_not_selected: boolean = false) {
  const current_index = Number($('#world_editor_select').val());
  const selected_index = world_names.indexOf(file);
  if (selected_index !== -1 && (load_if_not_selected || current_index === selected_index)) {
    $('#world_editor_select').val(selected_index).trigger('change');
  }
}

export async function copyText(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    return;
  }

  const parent = document.querySelector('dialog[open]:last-of-type') ?? document.body;
  const textArea = document.createElement('textarea');
  textArea.value = text;
  parent.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.execCommand('copy');
  parent.removeChild(textArea);
}

export const reloadEditorDebounced = _.debounce(reloadEditor, 1000);

export const settingsToUpdate = {
  max_context_unlocked: {
    selector: '#oai_max_context_unlocked',
    oai_setting: 'max_context_unlocked',
    type: 'checkbox',
  },
  openai_max_context: {
    selector: '#openai_max_context',
    oai_setting: 'openai_max_context',
    type: 'input',
  },
  openai_max_tokens: {
    selector: '#openai_max_tokens',
    oai_setting: 'openai_max_tokens',
    type: 'input',
  },
  n: {
    selector: '#n_openai',
    oai_setting: 'n',
    type: 'input',
  },

  stream_openai: {
    selector: '#stream_toggle',
    oai_setting: 'stream_openai',
    type: 'checkbox',
  },

  temperature: {
    selector: '#temp_openai',
    oai_setting: 'temp_openai',
    type: 'input',
  },
  frequency_penalty: {
    selector: '#freq_pen_openai',
    oai_setting: 'freq_pen_openai',
    type: 'input',
  },
  presence_penalty: {
    selector: '#pres_pen_openai',
    oai_setting: 'pres_pen_openai',
    type: 'input',
  },
  top_p: {
    selector: '#top_p_openai',
    oai_setting: 'top_p_openai',
    type: 'input',
  },
  repetition_penalty: {
    selector: '#repetition_penalty_openai',
    oai_setting: 'repetition_penalty_openai',
    type: 'input',
  },
  min_p: {
    selector: '#min_p_openai',
    oai_setting: 'min_p_openai',
    type: 'input',
  },
  top_k: {
    selector: '#top_k_openai',
    oai_setting: 'top_k_openai',
    type: 'input',
  },
  top_a: {
    selector: '#top_a_openai',
    oai_setting: 'top_a_openai',
    type: 'input',
  },

  seed: {
    selector: '#seed_openai',
    oai_setting: 'seed',
    type: 'input',
  },

  squash_system_messages: {
    selector: '#squash_system_messages',
    oai_setting: 'squash_system_messages',
    type: 'checkbox',
  },

  reasoning_effort: {
    selector: '#openai_reasoning_effort',
    oai_setting: 'reasoning_effort',
    type: 'input',
  },
  show_thoughts: {
    selector: '#openai_show_thoughts',
    oai_setting: 'show_thoughts',
    type: 'checkbox',
  },
  request_images: {
    selector: '#openai_request_images',
    oai_setting: 'request_images',
    type: 'checkbox',
  },
  function_calling: {
    selector: '#openai_function_calling',
    oai_setting: 'function_calling',
    type: 'checkbox',
  },
  enable_web_search: {
    selector: '#openai_enable_web_search',
    oai_setting: 'enable_web_search',
    type: 'checkbox',
  },
  image_inlining: {
    selector: '#openai_image_inlining',
    oai_setting: 'image_inlining',
    type: 'checkbox',
  },
  inline_image_quality: {
    selector: '#openai_inline_image_quality',
    oai_setting: 'inline_image_quality',
    type: 'input',
  },
  video_inlining: {
    selector: '#openai_video_inlining',
    oai_setting: 'video_inlining',
    type: 'checkbox',
  },

  names_behavior: {
    selector: '#names_behavior',
    oai_setting: 'names_behavior',
    type: 'input',
  },
  wrap_in_quotes: {
    selector: '#wrap_in_quotes',
    oai_setting: 'wrap_in_quotes',
    type: 'checkbox',
  },

  prompts: {
    selector: '#prompts',
    oai_setting: 'prompts',
    type: 'none',
  },
  prompt_order: {
    selector: '#prompt_order',
    oai_setting: 'prompt_order',
    type: 'none',
  },

  extensions: {
    selector: '#extensions',
    oai_setting: 'extensions',
    type: 'none',
  },
} as const;
