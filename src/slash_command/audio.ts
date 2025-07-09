import {
  list_BGMS,
  list_ambients,
  onAudioEnabledClick,
  playAudio,
  updateAudio,
  updateAudioSelect,
} from '@/component/audio';
import { saveSettingValue } from '@/util/extension_variables';

import { chat_metadata, saveSettingsDebounced } from '@sillytavern/script';
import { saveMetadataDebounced } from '@sillytavern/scripts/extensions';
import { SlashCommand } from '@sillytavern/scripts/slash-commands/SlashCommand';
import {
  ARGUMENT_TYPE,
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { commonEnumProviders, enumIcons } from '@sillytavern/scripts/slash-commands/SlashCommandCommonEnumsProvider';
import { SlashCommandEnumValue, enumTypes } from '@sillytavern/scripts/slash-commands/SlashCommandEnumValue';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

import log from 'loglevel';

interface AudioElement extends HTMLElement {
  pause(): void;
}

/**
 * 切换音频播放模式
 */
export async function audioMode(args: { type: string; mode: string }): Promise<void> {
  const type = args.type.toLowerCase();
  const mode = args.mode.toLowerCase();

  if (!['bgm', 'ambient'].includes(type) || !['repeat', 'random', 'single', 'stop'].includes(mode)) {
    log.warn('WARN: Invalid arguments for /audiomode command');
    return '';
  }

  if (type === 'bgm') {
    saveSettingValue('audio.bgm_mode', mode);
    const iconMap: Record<string, string> = {
      repeat: 'fa-repeat',
      random: 'fa-random',
      single: 'fa-redo-alt',
      stop: 'fa-cancel',
    };
    $('#audio_bgm_mode_icon').removeClass('fa-repeat fa-random fa-redo-alt fa-cancel');
    $('#audio_bgm_mode_icon').addClass(iconMap[mode]);
  } else if (type === 'ambient') {
    saveSettingValue('audio.ambient_mode', mode);
    const iconMap: Record<string, string> = {
      repeat: 'fa-repeat',
      random: 'fa-random',
      single: 'fa-redo-alt',
      stop: 'fa-cancel',
    };
    $('#audio_ambient_mode_icon').removeClass('fa-repeat fa-random fa-redo-alt fa-cancel');
    $('#audio_ambient_mode_icon').addClass(iconMap[mode]);
  }

  saveSettingsDebounced();
  return '';
}

/**
 * 切换播放器开关状态
 */
export async function audioEnable(args: { type: string; state?: string }): Promise<void> {
  const type = args.type.toLowerCase();
  const state = (args.state || 'true').toLowerCase();

  if (!type) {
    log.warn('WARN: Missing arguments for /audioenable command');
    return '';
  }

  if (type === 'bgm') {
    if (state === 'true') {
      $('#enable_bgm').prop('checked', true);
      await onAudioEnabledClick('bgm');
    } else if (state === 'false') {
      $('#enable_bgm').prop('checked', false);
      await onAudioEnabledClick('bgm');
    }
  } else if (type === 'ambient') {
    if (state === 'true') {
      $('#enable_ambient').prop('checked', true);
      await onAudioEnabledClick('ambient');
    } else if (state === 'false') {
      $('#enable_ambient').prop('checked', false);
      await onAudioEnabledClick('ambient');
    }
  }

  return '';
}

/**
 * 切换播放/暂停状态
 */
export async function audioPlay(args: { type: string; play?: string }): Promise<void> {
  const type = args.type.toLowerCase();
  const play = (args.play || 'true').toLowerCase();

  if (!type) {
    log.warn('WARN: Missing arguments for /audioplaypause command');
    return '';
  }

  if (type === 'bgm') {
    if (play === 'true') {
      await playAudio('bgm');
    } else if (play === 'false') {
      const audioElement = $('#audio_bgm')[0] as AudioElement;
      audioElement.pause();
    }
  } else if (type === 'ambient') {
    if (play === 'true') {
      await playAudio('ambient');
    } else if (play === 'false') {
      const audioElement = $('#audio_ambient')[0] as AudioElement;
      audioElement.pause();
    }
  }

  return '';
}

/**
 * 导入音频链接
 */
export async function audioImport(args: { type: string; play?: string }, url: string): Promise<void> {
  const type = args.type.toLowerCase();
  const play = (args.play || 'true').toLowerCase();

  if (!type || !url) {
    log.warn('WARN: Missing arguments for /audioimport command');
    return '';
  }

  const urlArray = url
    .split(',')
    .map((url: string) => url.trim())
    .filter((url: string) => url !== '')
    .filter((url: string, index: number, self: string[]) => self.indexOf(url) === index);
  if (urlArray.length === 0) {
    log.warn('WARN: Invalid or empty URLs provided.');
    return '';
  }

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const typeKey = type === 'bgm' ? 'bgmurl' : 'ambienturl';
  const existingUrls = chat_metadata.variables[typeKey] || [];
  const mergedUrls = [...new Set([...urlArray, ...existingUrls])];

  chat_metadata.variables[typeKey] = mergedUrls;
  saveMetadataDebounced();

  if (type === 'bgm') {
    updateAudioSelect('bgm');
  } else if (type === 'ambient') {
    updateAudioSelect('ambient');
  }

  if (play === 'true' && urlArray[0]) {
    const selectedUrl = urlArray[0];
    if (type === 'bgm') {
      saveSettingValue('audio.bgm_selected', selectedUrl);
      await updateAudio('bgm', true);
    } else if (type === 'ambient') {
      saveSettingValue('audio.ambient_selected', selectedUrl);
      await updateAudio('ambient', true);
    }
  }

  return '';
}

/**
 * 选择并播放音频
 */
export async function audioSelect(args: { type: string }, url: string): Promise<void> {
  const type = args.type.toLowerCase();

  if (!url) {
    log.warn('WARN: Missing URL for /audioselect command');
    return '';
  }

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const playlist = type === 'bgm' ? list_BGMS : list_ambients;
  const typeKey = type === 'bgm' ? 'bgmurl' : 'ambienturl';

  if (playlist && playlist.includes(url)) {
    if (type === 'bgm') {
      saveSettingValue('audio.bgm_selected', url);
      await updateAudio('bgm', true);
    } else if (type === 'ambient') {
      saveSettingValue('audio.ambient_selected', url);
      await updateAudio('ambient', true);
    }
    return '';
  }

  const existingUrls = chat_metadata.variables[typeKey] || [];

  const mergedUrls = [...new Set([url, ...existingUrls])];
  chat_metadata.variables[typeKey] = mergedUrls;
  saveMetadataDebounced();

  if (type === 'bgm') {
    updateAudioSelect('bgm');
    saveSettingValue('audio.bgm_selected', url);
    await updateAudio('bgm', true);
  } else if (type === 'ambient') {
    updateAudioSelect('ambient');
    saveSettingValue('audio.ambient_selected', url);
    await updateAudio('ambient', true);
  }

  return '';
}

/**
 * 初始化音频相关的 slash command
 */
export function initAudioSlashCommands() {
  // 注册 audioselect 命令
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioselect',
      callback: audioSelect,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'type',
          description: '选择播放器类型 (bgm 或 ambient)',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('bgm', null, enumTypes.enum, enumIcons.file),
            new SlashCommandEnumValue('ambient', null, enumTypes.enum, enumIcons.file),
          ],
          isRequired: true,
        }),
      ],
      unnamedArgumentList: [new SlashCommandArgument('url', [ARGUMENT_TYPE.STRING], true)],
      helpString: `
        <div>
            选择并播放音频。如果音频链接不存在，则先导入再播放。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioselect type=bgm https://example.com/song.mp3</code></pre>
                    选择并播放指定的音乐。
                </li>
                <li>
                    <pre><code>/audioselect type=ambient https://example.com/sound.mp3</code></pre>
                    选择并播放指定的音效。
                </li>
            </ul>
        </div>
      `,
    }),
  );

  // 注册 audioimport 命令
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioimport',
      callback: audioImport,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'type',
          description: '选择导入类型 (bgm 或 ambient)',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('bgm', null, enumTypes.enum, enumIcons.file),
            new SlashCommandEnumValue('ambient', null, enumTypes.enum, enumIcons.file),
          ],
          isRequired: true,
        }),
        SlashCommandNamedArgument.fromProps({
          name: 'play',
          description: '导入后是否立即播放第一个链接',
          typeList: [ARGUMENT_TYPE.BOOLEAN],
          defaultValue: 'true',
          isRequired: false,
        }),
      ],
      unnamedArgumentList: [new SlashCommandArgument('url', [ARGUMENT_TYPE.STRING], true)],
      helpString: `
        <div>
            导入音频或音乐链接，并决定是否立即播放，默认为自动播放。可批量导入链接，使用英文逗号分隔。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioimport type=bgm https://example.com/song1.mp3,https://example.com/song2.mp3</code></pre>
                    导入 BGM 音乐并立即播放第一个链接。
                </li>
                <li>
                    <pre><code>/audioimport type=ambient play=false url=https://example.com/sound1.mp3,https://example.com/sound2.mp3 </code></pre>
                    导入音效链接 (不自动播放)。
                </li>
            </ul>
        </div>
      `,
    }),
  );

  // 注册 audioplay 命令
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioplay',
      callback: audioPlay,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'type',
          description: '选择控制的播放器 (bgm 或 ambient)',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('bgm', null, enumTypes.enum, enumIcons.file),
            new SlashCommandEnumValue('ambient', null, enumTypes.enum, enumIcons.file),
          ],
          isRequired: true,
        }),
        new SlashCommandNamedArgument(
          'play',
          '播放或暂停',
          [ARGUMENT_TYPE.STRING],
          true,
          false,
          'true',
          commonEnumProviders.boolean('trueFalse')(),
        ),
      ],
      helpString: `
        <div>
            控制音乐播放器或音效播放器的播放与暂停。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioplay type=bgm</code></pre>
                    播放当前音乐。
                </li>
                <li>
                    <pre><code>/audioplay type=ambient play=false</code></pre>
                    暂停当前音效。
                </li>
            </ul>
        </div>
      `,
    }),
  );

  // 注册 audioenable 命令
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioenable',
      callback: audioEnable,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'type',
          description: '选择控制的播放器 (bgm 或 ambient)',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('bgm', null, enumTypes.enum, enumIcons.file),
            new SlashCommandEnumValue('ambient', null, enumTypes.enum, enumIcons.file),
          ],
          isRequired: true,
        }),
        new SlashCommandNamedArgument(
          'state',
          '打开或关闭播放器',
          [ARGUMENT_TYPE.STRING],
          false,
          false,
          'true',
          commonEnumProviders.boolean('trueFalse')(),
        ),
      ],
      helpString: `
        <div>
            控制音乐播放器或音效播放器的开启与关闭。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioenable type=bgm state=true</code></pre>
                    打开音乐播放器。
                </li>
                <li>
                    <pre><code>/audioenable type=ambient state=false</code></pre>
                    关闭音效播放器。
                </li>
            </ul>
        </div>
    `,
    }),
  );

  // 注册 audiomode 命令
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audiomode',
      callback: audioMode,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'type',
          description: '选择控制的播放器 (bgm 或 ambient)',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('bgm', null, enumTypes.enum, enumIcons.file),
            new SlashCommandEnumValue('ambient', null, enumTypes.enum, enumIcons.file),
          ],
          isRequired: true,
        }),
        SlashCommandNamedArgument.fromProps({
          name: 'mode',
          description: '选择播放模式',
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue('repeat', null, enumTypes.enum, enumIcons.loop),
            new SlashCommandEnumValue('random', null, enumTypes.enum, enumIcons.shuffle),
            new SlashCommandEnumValue('single', null, enumTypes.enum, enumIcons.redo),
            new SlashCommandEnumValue('stop', null, enumTypes.enum, enumIcons.stop),
          ],
          isRequired: true,
        }),
      ],
      helpString: `
        <div>
            设置音频播放模式。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audiomode type=bgm mode=repeat</code></pre>
                    设置音乐为循环播放模式。
                </li>
                <li>
                    <pre><code>/audiomode type=ambient mode=random</code></pre>
                    设置音效为随机播放模式。
                </li>
                <li>
                    <pre><code>/audiomode type=bgm mode=single</code></pre>
                    设置音乐为单曲循环模式。
                </li>
                <li>
                    <pre><code>/audiomode type=ambient mode=stop</code></pre>
                    设置音效为停止播放模式。
                </li>
            </ul>
        </div>
    `,
    }),
  );
}
