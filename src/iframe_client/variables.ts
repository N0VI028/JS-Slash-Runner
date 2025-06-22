//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们

/** @deprecated 这个函数是在事件监听功能之前制作的, 现在请使用 `insertOrAssignVariables` 而用事件监听或条件判断来控制怎么更新 */
async function setVariables(
  message_id: number | Record<string, any>,
  new_or_updated_variables?: Record<string, any>,
): Promise<void> {
  let actual_message_id: number;
  let actual_variables: Record<string, any>;
  if (new_or_updated_variables) {
    actual_message_id = message_id as number;
    actual_variables = new_or_updated_variables as Record<string, any>;
  } else {
    actual_message_id = getCurrentMessageId();
    actual_variables = message_id as Record<string, any>;
  }
  if (typeof actual_message_id !== 'number' || typeof actual_variables !== 'object') {
    console.error('[Variables][setVariables] 调用出错, 请检查你的参数类型是否正确');
    return;
  }
  return detail.make_iframe_promise({
    request: '[Variables][setVariables]',
    message_id: actual_message_id,
    variables: actual_variables,
  });
}

//------------------------------------------------------------------------------------------------------------------------
// 脚本变量相关功能

/**
 * 获取指定脚本的变量数据
 * @returns 脚本的data字段，如果脚本不存在返回空对象
 */
async function getScriptVariables(): Promise<{ [key: string]: any }> {
  const actual_script_id = getScriptId();
  
  if (typeof actual_script_id !== 'string') {
    console.error('[Variables][getScriptVariables] 调用出错, script_id必须是字符串类型');
    return {};
  }

  return detail.make_iframe_promise({
    request: '[Variables][getScriptVariables]',
    script_id: actual_script_id,
  });
}

/**
 * 替换脚本变量表
 * @param variables 新的变量数据
 * @returns Promise<void>
 */
async function replaceScriptVariables(variables: Record<string, any>): Promise<void> {
  const actual_script_id = getScriptId();
  
  if (typeof actual_script_id !== 'string') {
    console.error('[Variables][replaceScriptVariables] 调用出错, script_id必须是字符串类型');
    return;
  }

  if (typeof variables !== 'object' || variables === null) {
    console.error('[Variables][replaceScriptVariables] 调用出错, variables必须是对象类型');
    return;
  }

  return detail.make_iframe_promise({
    request: '[Variables][replaceScriptVariables]',
    script_id: actual_script_id,
    variables: variables,
  });
}

/**
 * 使用更新器函数更新脚本变量
 * @param updater 更新器函数，接收当前变量表并返回新的变量表
 * @returns Promise<Record<string, any>> 更新后的变量表
 */
async function updateScriptVariablesWith(
  updater: (variables: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>
): Promise<Record<string, any>> {
  const actual_script_id = getScriptId();
  
  if (typeof actual_script_id !== 'string') {
    console.error('[Variables][updateScriptVariablesWith] 调用出错, script_id必须是字符串类型');
    return {};
  }

  if (typeof updater !== 'function') {
    console.error('[Variables][updateScriptVariablesWith] 调用出错, updater必须是函数类型');
    return {};
  }

  let variables = await getScriptVariables();
  
  variables = await updater(variables);
  
  await replaceScriptVariables(variables);
  
  return variables;
}

/**
 * 插入或分配脚本变量（会覆盖相同键的值）
 * @param variables 要插入或更新的变量数据
 * @returns Promise<void>
 */
async function insertOrAssignScriptVariables(variables: Record<string, any>): Promise<void> {
  if (typeof variables !== 'object' || variables === null) {
    console.error('[Variables][insertOrAssignScriptVariables] 调用出错, variables必须是对象类型');
    return;
  }

  await updateScriptVariablesWith(old_variables => ({ ...old_variables, ...variables }));
}

/**
 * 插入脚本变量（不会覆盖已存在的值）
 * @param variables 要插入的变量数据
 * @returns Promise<void>
 */
async function insertScriptVariables(variables: Record<string, any>): Promise<void> {
  if (typeof variables !== 'object' || variables === null) {
    console.error('[Variables][insertScriptVariables] 调用出错, variables必须是对象类型');
    return;
  }

  await updateScriptVariablesWith(old_variables => {
    const result = { ...old_variables };
    Object.keys(variables).forEach(key => {
      if (!(key in result)) {
        result[key] = variables[key];
      }
    });
    return result;
  });
}

/**
 * 删除脚本变量
 * @param variable_path 变量路径（支持嵌套路径，如 "a.b.c"）
 * @returns Promise<boolean> 是否成功删除
 */
async function deleteScriptVariable(variable_path: string): Promise<boolean> {
  if (typeof variable_path !== 'string' || variable_path.trim() === '') {
    console.error('[Variables][deleteScriptVariable] 调用出错, variable_path必须是非空字符串');
    return false;
  }

  const actual_script_id = getScriptId();
  
  if (typeof actual_script_id !== 'string') {
    console.error('[Variables][deleteScriptVariable] 调用出错, script_id必须是字符串类型');
    return false;
  }

  return detail.make_iframe_promise({
    request: '[Variables][deleteScriptVariable]',
    script_id: actual_script_id,
    variable_path: variable_path,
  });
}
