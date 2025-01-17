import { executeSlashCommandsWithOptions } from "../../../../../slash-commands.js";
import { getIframeName, IframeMessage, registerIframeHandler } from "./index.js";

interface IframeSlash extends IframeMessage {
  request: 'iframe_trigger_slash' | 'iframe_trigger_slash_with_result'
  command: string;
}

export function registerIframeSlashHandler() {
  registerIframeHandler(
    'iframe_trigger_slash',
    async (event: MessageEvent<IframeSlash>): Promise<void> => {
      const iframe_name = getIframeName(event);
      const command = event.data.command;

      await executeSlashCommandsWithOptions(command);

      console.info(`[Slash][TriggerSlash](${iframe_name}) 运行 Slash 命令: ${command}`);
    },
  )

  registerIframeHandler(
    'iframe_trigger_slash_with_result',
    async (event: MessageEvent<IframeSlash>): Promise<string | undefined> => {
      const iframe_name = getIframeName(event);
      const command = event.data.command;

      const result = await executeSlashCommandsWithOptions(command);
      if (result.isError) {
        throw Error(`[Slash][TriggerSlashWithResult]${iframe_name} 运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
      }

      console.info(`[Slash][TriggerSlashWithResult](${iframe_name}) 运行 Slash 命令: ${command}`);
      return result.pipe;
    },
  )
}
