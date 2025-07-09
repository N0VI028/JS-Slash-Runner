import { world_names } from '@sillytavern/scripts/world-info';

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

export const reloadEditorDebounced = _.debounce(reloadEditor, 1000);
