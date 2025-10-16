import Popup from '@/panel/component/Popup.vue';
import { useCharacterScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useGlobalSettingsStore } from '@/store/settings';
import { preset_manager, version } from '@/util/tavern';
import { event_types, eventSource } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { accountStorage } from '@sillytavern/scripts/util/AccountStorage';
import { compare } from 'compare-versions';
import _ from 'lodash';

function getCharacterKey(name: string): string {
  return `TavernHelper_AlertScript_Character_${name}`;
}

function checkEmbeddedCharacterScripts(name: string, scripts: ReturnType<typeof useCharacterScriptsStore>) {
  if (scripts.script_trees.length === 0 || scripts.enabled) {
    return;
  }

  const key = getCharacterKey(name);
  if (!accountStorage.getItem(key)) {
    accountStorage.setItem(key, 'true');
    useModal({
      component: Popup,
      attrs: {
        buttons: [
          {
            name: t`确认`,
            shouldEmphasize: true,
            onClick: close => {
              scripts.enabled = true;
              close();
            },
          },
          { name: t`取消` },
        ],
      },
      slots: {
        default: `<div><h4>此角色包含酒馆助手可用的嵌入式脚本</h4><h4>是否现在就启用它们?</h4><small>您可以选择否, 稍后在“酒馆助手-脚本库-角色脚本”中手动启用它们</small></div>`,
      },
    }).open();
  }
}

function getPresetKey(name: string): string {
  return `TavernHelper_AlertScript_Preset_${name}`;
}

function checkEmbeddedPresetScripts(name: string, scripts: ReturnType<typeof usePresetScriptsStore>) {
  if (scripts.script_trees.length === 0 || scripts.enabled) {
    return;
  }

  const key = getPresetKey(name);
  if (!accountStorage.getItem(key)) {
    accountStorage.setItem(key, 'true');
    useModal({
      component: Popup,
      attrs: {
        buttons: [
          {
            name: t`确认`,
            shouldEmphasize: true,
            onClick: close => {
              scripts.enabled = true;
              close();
            },
          },
          { name: t`取消` },
        ],
      },
      slots: {
        default: t`<div><h4>此预设包含酒馆助手可用的嵌入式脚本</h4><h4>是否现在就启用它们?</h4><small>您可以选择否, 稍后在“酒馆助手-脚本库-预设脚本”中手动启用它们</small></div>`,
      },
    }).open();
  }
}

export function useCheckEnablementPopup(
  character_name: Ref<string | undefined>,
  preset_name: Ref<string>,
  global_settings: ReturnType<typeof useGlobalSettingsStore>,
  character_scripts: ReturnType<typeof useCharacterScriptsStore>,
  preset_scripts: ReturnType<typeof usePresetScriptsStore>,
) {
  watch(
    character_name,
    new_name => {
      if (new_name === undefined) {
        return;
      }
      checkEmbeddedCharacterScripts(new_name, character_scripts);
    },
    { flush: 'post' },
  );
  eventSource.on(event_types.CHARACTER_DELETED, ({ character }: { character: v1CharData }) => {
    const key = getCharacterKey(character.name);
    if (accountStorage.getItem(key)) {
      accountStorage.removeItem(key);
    }
    _.pull(global_settings.settings.script.enabled.characters, character.name);
  });

  watch(
    preset_name,
    new_name => {
      checkEmbeddedPresetScripts(new_name, preset_scripts);
    },
    { flush: 'post' },
  );
  if (compare(version, '1.13.5', '>=')) {
    eventSource.on(event_types.PRESET_RENAMED_BEFORE, ({ oldName, newName }: { oldName: string; newName: string }) => {
      const old_key = getPresetKey(oldName);
      const key = getPresetKey(newName);
      if (accountStorage.getItem(old_key)) {
        accountStorage.setItem(key, 'true');
        accountStorage.removeItem(old_key);
      }
      _.pull(global_settings.settings.script.enabled.presets, oldName);
      global_settings.settings.script.enabled.presets.push(newName);
    });
    eventSource.on(event_types.PRESET_DELETED, ({ name }: { name: string }) => {
      const key = getPresetKey(name);
      if (accountStorage.getItem(key)) {
        accountStorage.removeItem(key);
      }
      _.pull(global_settings.settings.script.enabled.presets, name);
    });
  } else {
    eventSource.on(
      event_types.OAI_PRESET_CHANGED_AFTER,
      _.debounce(() => {
        const names = preset_manager.getAllPresets();
        Object.keys(accountStorage.getState())
          .filter(
            key =>
              key.startsWith('TavernHelper_AlertScript_Preset_') &&
              !names.includes(key.replace('TavernHelper_AlertScript_Preset_', '')),
          )
          .forEach(key => {
            accountStorage.removeItem(key);
          });
        _.remove(global_settings.settings.script.enabled.presets, item => !names.includes(item));
      }, 1000),
    );
  }
}
