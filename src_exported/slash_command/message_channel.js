export { slashEventEmit };
import { eventSource } from "../../../../../../script.js";
import { SlashCommand } from "../../../../../slash-commands/SlashCommand.js";
import { ARGUMENT_TYPE, SlashCommandArgument, SlashCommandNamedArgument } from "../../../../../slash-commands/SlashCommandArgument.js";
import { SlashCommandParser } from "../../../../../slash-commands/SlashCommandParser.js";
async function slashEventEmit(args, value) {
    const data = args.data;
    const event = value;
    if (!data) {
        eventSource.emit(event);
    }
    else if (Array.isArray(data)) {
        eventSource.emit(event, ...data);
    }
    else {
        eventSource.emit(event, data);
    }
    return event;
}
export function initSlashEventEmit() {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'event-emit',
        callback: slashEventEmit,
        returns: "发送的事件名称",
        namedArgumentList: [
            SlashCommandNamedArgument.fromProps({
                name: 'data',
                description: '要传输的数据',
                typeList: [ARGUMENT_TYPE.STRING, ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.BOOLEAN, ARGUMENT_TYPE.LIST, ARGUMENT_TYPE.DICTIONARY],
                isRequired: false
            })
        ],
        unnamedArgumentList: [
            new SlashCommandArgument('事件名称', [ARGUMENT_TYPE.STRING], true)
        ],
        helpString: `
    <div>
        发送某个事件, 同时可以发送一些数据 \`data\`.
        所有正在监听该消息频道的 listener 都会自动运行.
    </div>
    <div>
        <strong>Example:</strong>
        <ul>
            <li>
                <pre><code class="language-stscript">/event-emit "读档"</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/event-emit data={{getvar::数据}} "存档"</code></pre>
            </li>
            <li>
                <pre><code class="language-stscript">/notify-all data=8 "随便什么名称"</code></pre>
            </li>
        </ul>
    </div>
  `
    }));
}
//# sourceMappingURL=message_channel.js.map