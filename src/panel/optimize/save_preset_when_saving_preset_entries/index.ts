export function useSavePresetWhenSavingPresetEntries(enabled: Readonly<Ref<boolean>>) {
  const handler = () => $('#update_oai_preset').trigger('click');

  watchImmediate(enabled, new_enabled => {
    const $save = $('#completion_prompt_manager_popup_entry_form_save');
    if (new_enabled) {
      $save.on('click', handler);
    } else {
      $save.off('click', handler);
    }
  });
}
