import Popup from '@/panel/component/Popup.vue';
import { useCharacterScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useGlobalSettingsStore } from '@/store/settings';
import { preset_manager, version } from '@/util/tavern';
import { event_types, eventSource } from '@sillytavern/script';
import { v1CharData } from '@sillytavern/scripts/char-data';
import { compare } from 'compare-versions';

export function useCheckEnablementPopup(
  preset_name: Readonly<Ref<string>>,
  character_name: Readonly<Ref<string | undefined>>,
  global_settings: ReturnType<typeof useGlobalSettingsStore>,
  preset_scripts: ReturnType<typeof usePresetScriptsStore>,
  character_scripts: ReturnType<typeof useCharacterScriptsStore>,
) {
  // TODO: Don't Repeat
  watch(preset_name, new_name => {
    if (preset_scripts.script_trees.length === 0 || preset_scripts.enabled) {
      return;
    }

    if (!global_settings.settings.script.popuped.presets.includes(new_name)) {
      global_settings.settings.script.popuped.presets.push(new_name);
      useModal({
        component: Popup,
        attrs: {
          buttons: [
            {
              name: t`确认`,
              shouldEmphasize: true,
              onClick: close => {
                preset_scripts.enabled = true;
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
  });
  if (compare(version, '1.13.5', '>=')) {
    eventSource.on(event_types.PRESET_RENAMED_BEFORE, ({ oldName, newName }: { oldName: string; newName: string }) => {
      if (global_settings.settings.script.popuped.presets.includes(oldName)) {
        _.pull(global_settings.settings.script.popuped.presets, oldName);
        global_settings.settings.script.popuped.presets.push(newName);
      }
      if (global_settings.settings.script.enabled.presets.includes(oldName)) {
        _.pull(global_settings.settings.script.enabled.presets, oldName);
        global_settings.settings.script.enabled.presets.push(newName);
      }
    });
    eventSource.on(event_types.PRESET_DELETED, ({ name }: { name: string }) => {
      if (global_settings.settings.script.popuped.presets.includes(name)) {
        _.pull(global_settings.settings.script.popuped.presets, name);
      }
      _.pull(global_settings.settings.script.enabled.presets, name);
    });
  } else {
    eventSource.on(
      event_types.OAI_PRESET_CHANGED_AFTER,
      _.debounce(() => {
        const names = preset_manager.getAllPresets();
        _.remove(global_settings.settings.script.popuped.presets, item => !names.includes(item));
        _.remove(global_settings.settings.script.enabled.presets, item => !names.includes(item));
      }, 1000),
    );
  }

  watch(character_name, new_name => {
    if (new_name === undefined || character_scripts.script_trees.length === 0 || character_scripts.enabled) {
      return;
    }

    if (!global_settings.settings.script.popuped.characters.includes(new_name)) {
      global_settings.settings.script.popuped.characters.push(new_name);
      useModal({
        component: Popup,
        attrs: {
          buttons: [
            {
              name: t`确认`,
              shouldEmphasize: true,
              onClick: close => {
                character_scripts.enabled = true;
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
  });
  eventSource.on(event_types.CHARACTER_RENAMED, (old_avatar: string, new_avatar: string) => {
    const old_name = old_avatar.replace('.png', '');
    const new_name = new_avatar.replace('.png', '');
    if (global_settings.settings.script.popuped.characters.includes(old_name)) {
      _.pull(global_settings.settings.script.popuped.characters, old_name);
      global_settings.settings.script.popuped.characters.push(new_name);
    }
    if (global_settings.settings.script.enabled.characters.includes(old_name)) {
      _.pull(global_settings.settings.script.enabled.characters, old_name);
      global_settings.settings.script.enabled.characters.push(new_name);
    }
  });
  eventSource.on(event_types.CHARACTER_DELETED, ({ character }: { character: v1CharData }) => {
    if (global_settings.settings.script.popuped.characters.includes(character.name)) {
      _.pull(global_settings.settings.script.popuped.characters, character.name);
    }
    _.pull(global_settings.settings.script.enabled.characters, character.name);
  });
}
