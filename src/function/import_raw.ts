import { getRequestHeaders } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { render_tavern_regexes_debounced } from './tavern_regex';
import { updateWorldInfoList } from '@/compatibility';

export async function importRawCharacter(filename: string, content: Blob): Promise<Response> {
  const file = new File([content], filename, { type: 'image/png' });

  const from_data = new FormData();
  from_data.append('avatar', file);
  from_data.append('file_type', 'png');
  from_data.append('preserved_name', file.name);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch('/api/characters/import', {
    method: 'POST',
    headers: headers,
    body: from_data,
    cache: 'no-cache',
  }).then(result => {
    $('#character_search_bar').val('').trigger('input');
    return result;
  });
}

export async function importRawPreset(filename: string, content: string): Promise<Response> {
  return fetch(`/api/presets/save-openai?name=${filename.replace(/\.[^/.]+$/, '')}`, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: content,
  }).then(result => {
    $('#settings_preset_openai')[0].dispatchEvent(new Event('change'));
    return result;
  });
}

export async function importRawWorldbook(filename: string, content: string): Promise<Response> {
  const file = new File([content], filename, { type: 'application/json' });

  const form_data = new FormData();
  form_data.append('avatar', file);

  const headers = getRequestHeaders();
  _.unset(headers, 'Content-Type');
  return fetch(`/api/worldinfo/import`, {
    method: 'POST',
    headers: headers,
    body: form_data,
  }).then(result => {
    updateWorldInfoList();
    return result;
  });
}

export function importRawTavernRegex(filename: string, content: string): boolean {
  const json = JSON.parse(content);
  if (!_.has(json, 'findRegex')) {
    return false;
  }

  _.set(json, 'id', uuidv4());
  _.set(json, 'scriptName', filename);

  extension_settings.regex.push(json);
  render_tavern_regexes_debounced();
  return true;
}
