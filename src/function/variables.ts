import { chat_metadata, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings, saveMetadataDebounced } from '@sillytavern/scripts/extensions';

interface VariableOption {
  type: 'chat' | 'global'; // 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
}

function getVariablesByType(type: 'chat' | 'global'): Record<string, any> {
  switch (type) {
    case 'chat': {
      const metadata = chat_metadata as {
        variables: Record<string, any> | undefined;
      };
      if (!metadata.variables) {
        metadata.variables = {};
      }
      return metadata.variables;
    }
    case 'global':
      return extension_settings.variables.global;
  }
}

/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @returns 变量表
 *
 * @example
 * // 获取所有聊天变量并弹窗输出结果
 * const variables = getVariables();
 * alert(variables);
 *
 * @example
 * // 获取所有全局变量
 * const variables = getVariables({type: 'global'});
 * // 酒馆助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
 * if (_.has(variables, "神乐光.好感度")) {
 *   ...
 * }
 */
export function getVariables(option: VariableOption = { type: 'chat' }): Record<string, any> {
  const { type = 'chat' } = option;
  const result = getVariablesByType(type);

  console.info(`$获取${type == 'chat' ? `聊天` : `全局`}变量表:\n${JSON.stringify(result, undefined, 2)}`);
  return result;
}

/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为酒馆助手内置了 lodash 库:
 *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @example
 * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * let variables = getVariables();
 * _.unset(variables, "神乐光.好感度");
 * replaceVariables(variables);
 */
export function replaceVariables(variables: Record<string, any>, option: VariableOption = { type: 'chat' }): void {
  const { type = 'chat' } = option;
  switch (type) {
    case 'chat':
      (chat_metadata as { variables: Object }).variables = variables;
      saveMetadataDebounced();
      break;
    case 'global':
      extension_settings.variables.global = variables;
      saveSettingsDebounced();
      break;
  }

  console.info(`将${type == 'chat' ? `聊天` : `全局`}变量表替换为:\n${JSON.stringify(variables, undefined, 2)}`);
}

type VariablesUpdater =
  | ((variables: Record<string, any>) => Record<string, any>)
  | ((variables: Record<string, any>) => Promise<Record<string, any>>);

/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * await updateVariablesWith(variables => {_.unset(variables, "神乐光.好感度"); return variables;});
 *
 * @example
 * // 更新 "爱城华恋.好感度" 为原来的 2 倍, 如果该变量不存在则设置为 0
 * await updateVariablesWith(variables => _.update(variables, "爱城华恋.好感度", value => value ? value * 2 : 0));
 */
async function updateVariablesWith(updater: VariablesUpdater, option: VariableOption = { type: 'chat' }): Promise<Record<string, any>> {
  const { type = 'chat' } = option;
  let variables = await getVariables({ type });
  variables = await updater(variables);
  console.info(`[Chat Message][updateVariablesWith] 对${type === 'chat' ? `聊天` : `全局`}变量表进行更新, 使用的函数:\n\n ${JSON.stringify(detail.format_function_to_string(updater))}`);
  replaceVariables(variables, option);
  return variables;
}

/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
export async function insertOrAssignVariables(variables: Record<string, any>, option: VariableOption = { type: 'chat' }): Promise<void> {
  const { type = 'chat' } = option;
  await updateVariablesWith(old_variables => _.merge(old_variables, variables), { type });
}
