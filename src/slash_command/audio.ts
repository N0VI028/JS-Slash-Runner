import { get_store_by_type, handle_url_to_title } from '@/function/audio';
import { SlashCommand } from '@sillytavern/scripts/slash-commands/SlashCommand';
import {
  ARGUMENT_TYPE,
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { commonEnumProviders, enumIcons } from '@sillytavern/scripts/slash-commands/SlashCommandCommonEnumsProvider';
import { SlashCommandEnumValue, enumTypes } from '@sillytavern/scripts/slash-commands/SlashCommandEnumValue';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function audioEnable(_args: { type: string; state?: string }): string {
  return '';
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function audioPlay(args: { type: string; play?: string }): string {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioplaypause command');
    return '';
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const play = Boolean(args.play ?? 'true');

  get_store_by_type(type).playing = play;
  return '';
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function audioMode(args: any): string {
  if (!['bgm', 'ambient'].includes(args.type) || !['repeat', 'random', 'single', 'stop'].includes(args.mode)) {
    console.warn('WARN: Invalid arguments for /audiomode command');
    return '';
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const mode = args.mode.toLowerCase() as 'single' | 'repeat' | 'random' | 'stop';

  get_store_by_type(type).mode = (
    {
      single: 'repeat_one',
      repeat: 'repeat_all',
      random: 'shuffle',
      stop: 'play_one_and_stop',
    } as const
  )[mode];
  return '';
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function audioImport(args: { type: string; play?: string }, url: string): string {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioplaypause command');
    return '';
  }
  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const play = Boolean(args.play ?? 'true');

  const store = get_store_by_type(type);

  const urls = _(url)
    .split(',')
    .map(url => url.trim())
    .filter(url => url !== '')
    .uniq()
    .filter(url => !store.playlist.some(item => item.url === url))
    .map(url => ({ url, title: handle_url_to_title(url) }))
    .value();
  if (urls.length === 0) {
    console.warn('WARN: Invalid or empty URLs provided for /audioimport command');
    return '';
  }

  store.playlist.push(...urls);
  if (play) {
    store.src = urls[0].url;
    store.progress = 0;
    store.playing = play;
  }
  return '';
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function audioSelect(args: { type: string }, url: string): string {
  if (!url) {
    console.warn('WARN: Missing URL for /audioselect command');
    return '';
  }
  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const store = get_store_by_type(type);
  if (!store.playlist.some(item => item.url === url)) {
    store.playlist.push({ url, title: handle_url_to_title(url) });
  }
  store.src = url;
  store.progress = 0;
  store.playing = true;
  return '';
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function initSlashAudio() {
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioenable',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
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

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioplay',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
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

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioselect',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
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

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioimport',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
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
            new SlashCommandEnumValue('repeat', null, enumTypes.enum),
            new SlashCommandEnumValue('random', null, enumTypes.enum),
            new SlashCommandEnumValue('single', null, enumTypes.enum),
            new SlashCommandEnumValue('stop', null, enumTypes.enum),
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
