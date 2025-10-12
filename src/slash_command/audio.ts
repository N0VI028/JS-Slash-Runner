import { get_store_by_type } from '@/function/audio';
import { handleUrlToTitle } from '@/store/audio';
import { SlashCommand } from '@sillytavern/scripts/slash-commands/SlashCommand';
import {
  ARGUMENT_TYPE,
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { commonEnumProviders, enumIcons } from '@sillytavern/scripts/slash-commands/SlashCommandCommonEnumsProvider';
import { SlashCommandEnumValue, enumTypes } from '@sillytavern/scripts/slash-commands/SlashCommandEnumValue';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

/**
 * Slash 命令：设置播放器开关状态
 */
export async function audioEnable(args: { type: string; state?: string }): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioenable command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const enabled = args.state === undefined ? true : args.state.toLowerCase() === 'true';

  const store = get_store_by_type(type);
  store.enabled = enabled;
}

/**
 * Slash 命令：设置音量 (范围 0-100)
 */
export async function audioVolume(args: { type: string; volume: string }): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audiovolume command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const volume = parseFloat(args.volume);

  if (isNaN(volume) || volume < 0 || volume > 100) {
    console.warn('WARN: Volume must be a number between 0 and 100');
    return;
  }

  const store = get_store_by_type(type);
  // 将 0-100 范围转换为 0-1 范围
  store.volume = volume / 100;

  // 如果设置音量大于0，自动取消静音
  if (volume > 0 && store.muted) {
    store.muted = false;
  } else if (volume === 0) {
    // 音量设置为0时，设置为静音
    store.muted = true;
  }
}

/**
 * Slash 命令：清空播放列表
 */
export async function audioClear(args: { type: string }): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioclear command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const store = get_store_by_type(type);

  // 清空播放列表
  store.playlist = [];
  // 清空当前播放源
  store.src = '';
  // 停止播放
  store.playing = false;
  // 重置进度
  store.progress = 0;
}

/**
 * Slash 命令：控制播放/暂停
 */
export async function audioPlay(args: { type: string; play?: string }): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioplay command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const play = args.play === undefined ? true : args.play.toLowerCase() === 'true';

  const store = get_store_by_type(type);
  store.playing = play;
}

/**
 * Slash 命令：设置播放模式
 */
export async function audioMode(args: { type: string; mode: string }): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type) || !['repeat', 'random', 'single', 'stop'].includes(args.mode)) {
    console.warn('WARN: Invalid arguments for /audiomode command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const mode = args.mode.toLowerCase() as 'single' | 'repeat' | 'random' | 'stop';

  get_store_by_type(type).mode = (
    {
      single: 'single',
      repeat: 'repeat',
      random: 'random',
      stop: 'stop',
    } as const
  )[mode];
}

/**
 * Slash 命令：导入音频到播放列表
 * @param args.type 播放器类型
 * @param args.play 是否立即播放
 * @param args.title 可选的标题列表（逗号分隔），与URL一一对应
 * @param url URL列表（逗号分隔）
 */
export async function audioImport(args: { type: string; play?: string; title?: string }, url: string): Promise<void> {
  if (!['bgm', 'ambient'].includes(args.type)) {
    console.warn('WARN: Invalid arguments for /audioimport command');
    return;
  }
  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const play = args.play === undefined ? true : args.play.toLowerCase() === 'true';

  const store = get_store_by_type(type);

  // 处理URL列表
  const urls = _(url)
    .split(',')
    .map(u => u.trim())
    .filter(u => u !== '')
    .uniq()
    .filter(u => !store.playlist.some(item => item.url === u))
    .value();

  if (urls.length === 0) {
    console.warn('WARN: Invalid or empty URLs provided for /audioimport command');
    return;
  }

  // 处理标题列表（如果提供）
  let titles: string[] = [];
  if (args.title) {
    titles = _(args.title)
      .split(',')
      .map(t => t.trim())
      .filter(t => t !== '')
      .value();
  }

  // 将URL转换为播放列表项格式
  const items = urls.map((u, index) => ({
    url: u,
    title: titles[index] || handleUrlToTitle(u),
  }));

  store.playlist.push(...items);

  if (play && items.length > 0) {
    store.src = items[0].url;
    store.progress = 0;
    store.playing = play;
  }
}

/**
 * Slash 命令：选择并播放指定音频
 * @param args.type 播放器类型
 * @param args.title 可选的标题，优先通过标题查找
 * @param url URL或标题
 */
export async function audioSelect(args: { type: string; title?: string }, url: string): Promise<void> {
  if (!url && !args.title) {
    console.warn('WARN: Missing URL or title for /audioselect command');
    return;
  }

  const type = args.type.toLowerCase() as 'bgm' | 'ambient';
  const store = get_store_by_type(type);

  let targetUrl: string | undefined;
  let targetTitle: string | undefined;

  // 如果提供了title参数，优先通过title查找
  if (args.title) {
    const foundItem = store.playlist.find(item => item.title === args.title);
    if (foundItem) {
      targetUrl = foundItem.url;
      targetTitle = foundItem.title;
    } else {
      // 如果title没找到，使用url参数作为URL
      targetUrl = url;
      targetTitle = args.title;
    }
  } else {
    // 没有提供title，尝试在播放列表中查找url
    const foundItem = store.playlist.find(item => item.url === url || item.title === url);
    if (foundItem) {
      targetUrl = foundItem.url;
      targetTitle = foundItem.title;
    } else {
      // 如果没找到，将url作为新的音频URL
      targetUrl = url;
      targetTitle = handleUrlToTitle(url);
    }
  }

  // 如果播放列表中不存在，添加到播放列表
  if (!store.playlist.some(item => item.url === targetUrl)) {
    store.playlist.push({
      url: targetUrl,
      title: targetTitle,
    });
  }

  store.src = targetUrl;
  store.progress = 0;
  store.playing = true;
}

/**
 * 初始化所有音频相关的 Slash 命令
 */
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
        SlashCommandNamedArgument.fromProps({
          name: 'title',
          description: '可选的标题，优先通过标题查找音频',
          typeList: [ARGUMENT_TYPE.STRING],
          isRequired: false,
        }),
      ],
      unnamedArgumentList: [new SlashCommandArgument('url', [ARGUMENT_TYPE.STRING], false)],
      helpString: `
        <div>
            选择并播放音频。可以通过 URL、标题或 title 参数查找音频。如果音频不存在，则先导入再播放。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioselect type=bgm https://example.com/song.mp3</code></pre>
                    通过 URL 选择并播放指定的音乐。
                </li>
                <li>
                    <pre><code>/audioselect type=bgm title="My Song"</code></pre>
                    通过标题选择并播放音乐（从播放列表中查找）。
                </li>
                <li>
                    <pre><code>/audioselect type=ambient title="Rain Sound" https://example.com/rain.mp3</code></pre>
                    使用自定义标题导入并播放音效。
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
        SlashCommandNamedArgument.fromProps({
          name: 'title',
          description: '可选的标题列表（逗号分隔），与 URL 一一对应',
          typeList: [ARGUMENT_TYPE.STRING],
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
                    导入 BGM 音乐并立即播放第一个链接（自动从 URL 提取标题）。
                </li>
                <li>
                    <pre><code>/audioimport type=bgm title="Song 1,Song 2" https://example.com/song1.mp3,https://example.com/song2.mp3</code></pre>
                    导入 BGM 音乐并指定自定义标题。
                </li>
                <li>
                    <pre><code>/audioimport type=ambient play=false title="Rain,Thunder" https://example.com/sound1.mp3,https://example.com/sound2.mp3</code></pre>
                    导入音效链接，使用自定义标题（不自动播放）。
                </li>
            </ul>
        </div>
      `,
    }),
  );

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audiomode',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
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

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audiovolume',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
      callback: audioVolume,
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
          name: 'volume',
          description: '音量值 (范围 0-100)',
          typeList: [ARGUMENT_TYPE.NUMBER],
          isRequired: true,
        }),
      ],
      helpString: `
        <div>
            设置播放器音量。音量范围为 0-100，0 表示静音，100 表示最大音量。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audiovolume type=bgm volume=50</code></pre>
                    将音乐播放器音量设置为 50%。
                </li>
                <li>
                    <pre><code>/audiovolume type=ambient volume=0</code></pre>
                    将音效播放器设置为静音。
                </li>
                <li>
                    <pre><code>/audiovolume type=bgm volume=100</code></pre>
                    将音乐播放器音量设置为最大。
                </li>
            </ul>
        </div>
      `,
    }),
  );

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'audioclear',
      // @ts-expect-error 实际可用，仅用于兼容旧应用，因此不考虑怎么修复类型错误
      callback: audioClear,
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
      ],
      helpString: `
        <div>
            清空播放列表，并停止当前播放。此操作会清除所有已导入的音频链接。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioclear type=bgm</code></pre>
                    清空音乐播放器的播放列表。
                </li>
                <li>
                    <pre><code>/audioclear type=ambient</code></pre>
                    清空音效播放器的播放列表。
                </li>
            </ul>
        </div>
      `,
    }),
  );
}
