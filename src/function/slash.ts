import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';

/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 */
export async function triggerSlash(command: string): Promise<string> {
  const result = await executeSlashCommandsWithOptions(command);
  if (result.isError) {
    throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
  }

  console.info(`运行 Slash 命令: ${command}`);
  return result.pipe;
}

// QUESTION: 弃用？保留实现但是只推荐使用triggerSlash
export async function triggerSlashWithResult(command: string): Promise<string> {
  const result = await executeSlashCommandsWithOptions(command);
  if (result.isError) {
    throw Error(`运行 Slash 命令 '${command}' 时出错: ${result.errorMessage}`);
  }

  console.info(`运行 Slash 命令 '${command}', 结果: ${result.pipe}`);
  return result.pipe;
}
