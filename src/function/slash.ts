import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';

export async function triggerSlash(command: string): Promise<string> {
  const result = await executeSlashCommandsWithOptions(command);
  if (result.isError) {
    throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
  }
  return result.pipe;
}
