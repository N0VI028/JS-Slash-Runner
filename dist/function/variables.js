"use strict";
// import { chat_metadata, saveSettingsDebounced } from '../../../../../../script.js';
// import { extension_settings, saveMetadataDebounced } from '../../../../../extensions.js';
// interface VariableOption {
//   type: 'chat' | 'global'; // 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
// }
// function getVariablesByType(type: 'chat' | 'global'): Record<string, any> {
//   switch (type) {
//     case 'chat':
//       const metadata = chat_metadata as {
//         variables: Record<string, any> | undefined;
//       };
//       if (!metadata.variables) {
//         metadata.variables = {};
//       }
//       return metadata.variables;
//     case 'global':
//       return extension_settings.variables.global;
//   }
// }
// /**
//  * 获取变量表
//  *
//  * @param option 可选选项
//  *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
//  *
//  * @returns 变量表
//  *
//  * @example
//  * // 获取所有聊天变量并弹窗输出结果
//  * const variables = getVariables();
//  * alert(variables);
//  *
//  * @example
//  * // 获取所有全局变量
//  * const variables = getVariables({type: 'global'});
//  * // 前端助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
//  * if (_.has(variables, "神乐光.好感度")) {
//  *   ...
//  * }
//  */
// export function getVariables({ type = 'chat' }: VariableOption): Record<string, any> {
//   const result = getVariablesByType(type);
//   console.info(`$获取${type == 'chat' ? `聊天` : `全局`}变量表:\n${JSON.stringify(result, undefined, 2)}`);
//   return result;
// }
// /**
//  * 完全替换变量表为 `variables`
//  *
//  * 之所以提供这么直接的函数, 是因为前端助手内置了 lodash 库:
//  *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
//  *
//  * @param variables 要用于替换的变量表
//  * @param option 可选选项
//  *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
//  *
//  * @example
//  * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
//  * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
//  * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
//  *
//  * @example
//  * // 删除 `{神乐光: {好感度: 5}}` 变量
//  * let variables = getVariables();
//  * _.unset(variables, "神乐光.好感度");
//  * replaceVariables(variables);
//  */
// export function replaceVariables(variables: Record<string, any>, { type = 'chat' }: VariableOption): void {
//   switch (type) {
//     case 'chat':
//       (chat_metadata as { variables: Object }).variables = variables;
//       saveMetadataDebounced();
//       break;
//     case 'global':
//       extension_settings.variables.global = variables;
//       saveSettingsDebounced();
//       break;
//   }
//   console.info(`将${type == 'chat' ? `聊天` : `全局`}变量表替换为:\n${JSON.stringify(variables, undefined, 2)}`);
// }
//# sourceMappingURL=variables.js.map