import { SlashCommand } from "../../../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from "../../../../../slash-commands/SlashCommandArgument.js";
import { SlashCommandParser } from "../../../../../slash-commands/SlashCommandParser.js";
import { message_manager } from "../iframe_server/message_channel.js";

async function slashNotifyAllCallback(args: any, value: any): Promise<any> {
  const data: any | null = args.data;
  const channel: string = value;

  if (!data) {
    message_manager.notifyAll(channel);
  } else if (Array.isArray(data)) {
    message_manager.notifyAll(channel, ...data);
  } else {
    message_manager.notifyAll(channel, data);
  }

  return channel;
}

export function initSlashNotifyAll() {
  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'notify-all',
    callback: slashNotifyAllCallback,
    returns: "使用的消息频道名称",
    namedArgumentList: [
      SlashCommandNamedArgument.fromProps({
        name: 'data',
        description: '要传输的数据',
        typeList: [ARGUMENT_TYPE.STRING, ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.BOOLEAN, ARGUMENT_TYPE.LIST, ARGUMENT_TYPE.DICTIONARY],
        isRequired: false
      })
    ],
    unnamedArgumentList: [
      new SlashCommandArgument('消息频道名称', [ARGUMENT_TYPE.STRING], true)
    ],
    helpString: `
    <div>
        发送消息到某个消息频道, 同时可以发送一些数据 \`data\`.
        所有正在等待该消息频道的都会收到该消息并接收到 \`data\`.
    </div>
    <div>
        <strong>Example:</strong>
        <ul>
            <li>
                <pre><code class="language-stscript">/notify-all "频道-激活脚本"</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/notify-all data={{getvar::数据}} "频道-传输数据"</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/notify-all data=8 "随便什么频道名称"</code></pre>
            </li>
        </ul>
    </div>
  `
  }));
}
