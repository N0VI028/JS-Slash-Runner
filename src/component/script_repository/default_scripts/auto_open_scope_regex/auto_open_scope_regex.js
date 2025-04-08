const characters = SillyTavern.characters;
const characterId = SillyTavern.characterId;

if (characterId === undefined) {
  return;
}
const avatar = characters[Number(characterId)].avatar;
const extension_settings = SillyTavern.extensionSettings.character_allowed_regex;
if (!extension_settings.includes(avatar)) {
  extension_settings.push(avatar);
  await SillyTavern.saveSettingsDebounced();
  SillyTavern.reloadCurrentChat();
}
