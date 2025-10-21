import { eventSource } from '@sillytavern/script';
import { SlashCommand } from '@sillytavern/scripts/slash-commands/SlashCommand';
import { ARGUMENT_TYPE, SlashCommandNamedArgument } from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export async function slashEventEmit(named_args: any): Promise<any> {
  const event: string = named_args.event;
  const data: string[] = named_args.data ?? [];

  await eventSource.emit(event, ...data);

  return event;
}

/** @deprecated 酒馆助手脚本已自带按钮，不再需要 /STScript */
export function initSlashEventEmit() {
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: 'event-emit',
      callback: slashEventEmit,
      returns: '发送的事件名称',
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: 'event',
          description: '事件名称',
          typeList: [ARGUMENT_TYPE.STRING],
          isRequired: true,
        }),
        SlashCommandNamedArgument.fromProps({
          name: 'data',
          description: '要传输的数据',
          typeList: [ARGUMENT_TYPE.STRING],
          isRequired: false,
          acceptsMultiple: true,
        }),
      ],
      unnamedArgumentList: [],
      helpString: `
    <div>
        发送 \`event\` 事件, 同时可以发送一些数据.
        所有正在监听该消息频道的 listener 函数都会自动运行, 并能用函数参数接收发送来的数据.
        由于酒馆 STScript 输入方式的局限性, 所有数据将会以字符串 string 类型接收; 如果需要 number 等类型, 请自行转换.
    </div>
    <div>
        <strong>Example:</strong>
        <ul>
            <li>
                <pre><code class="language-stscript">/event-emit event="读档"</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/event-emit event="存档" data={{getvar::数据}} data=8 data=你好 {{user}}</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/event-emit event="随便什么名称" data="这是一个 数据" data={{user}}</code></pre>
            </li>
        </ul>
    </div>
  `,
    }),
  );
}
