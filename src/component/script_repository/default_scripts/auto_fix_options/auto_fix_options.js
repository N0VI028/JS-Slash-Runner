const power_user = SillyTavern.powerUserSettings;

if (power_user.auto_fix_generated_markdown || power_user.trim_sentences || power_user.forbid_external_media) {
  power_user.auto_fix_generated_markdown = false;
  $('#auto_fix_generated_markdown').prop('checked', power_user.auto_fix_generated_markdown);

  power_user.trim_sentences = false;
  $('#trim_sentences_checkbox').prop('checked', power_user.trim_sentences);

  power_user.forbid_external_media = false;
  $('#forbid_external_media').prop('checked', power_user.forbid_external_media);

  await SillyTavern.saveSettingsDebounced();
}
