import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/_impl';

import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';

interface IframeSlash extends IframeMessage {
  request: '[Slash][triggerSlash]' | '[Slash][triggerSlashWithResult]';
  command: string;
}

export function registerIframeSlashHandler() {
  registerIframeHandler('[Slash][triggerSlash]', async (event: MessageEvent<IframeSlash>): Promise<void> => {
    const command = event.data.command;

    const result = await executeSlashCommandsWithOptions(command);
    if (result.isError) {
      throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
    }

    console.info(`${getLogPrefix(event)}运行 Slash 命令: ${command}`);
  });

  registerIframeHandler(
    '[Slash][triggerSlashWithResult]',
    async (event: MessageEvent<IframeSlash>): Promise<string | undefined> => {
      const command = event.data.command;

      const result = await executeSlashCommandsWithOptions(command);
      if (result.isError) {
        throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
      }

      console.info(`${getLogPrefix(event)}运行 Slash 命令 '${command}', 结果: ${result.pipe}`);
      return result.pipe;
    },
  );
}
