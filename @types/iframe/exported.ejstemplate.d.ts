/**
 * 提示词模板语法插件所提供的额外功能, 必须额外安装提示词模板语法插件, 具体内容见于 https://github.com/zonde306/ST-Prompt-Template
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.EjsTemplate` 来查看当前提示词模板语法所提供的接口
 */
declare const EjsTemplate: {
  /**
   * 对文本进行模板语法处理
   * @note `context` 一般从 `prepareContext` 获取, 若要修改则应直接修改原始对象
   *
   * @param code 模板代码
   * @param context 执行环境 (上下文)
   * @param options ejs 参数
   * @returns 对模板进行计算后的内容
   *
   * @example
   * // 使用提示词模板语法插件提供的函数创建一个临时的酒馆正则, 对消息楼层进行一次处理
   * await EjsTemplate.evalTemplate('<%_ await activateRegex(/<thinking>.*?<\/thinking>/gs, '') _%>')
   *
   * @example
   * const env    = await EjsTemplate.prepareContext({ a: 1 });
   * const result = await EjsTemplate.evalTemplate('a is <%= a _%>', env);
   * => result === 'a is 1'
   * // 但这种用法更推荐用 _.template 来做, 具体见于 https://lodash.com/docs/4.17.15#template
   * const compiled = _.template('hello <%= user %>!');
   * const result   = compiled({ 'user': 'fred' });;
   * => result === 'hello user!'
   */
  evaltemplate: (code: string, context?: Record<string, any>, options?: Record<string, any>) => Promise<string>;

  /**
   * 创建模板语法处理使用的执行环境 (上下文)
   *
   * @param additional_context 附加的执行环境 (上下文)
   * @param last_message_id 合并消息变量的最大 ID; 默认为所有
   * @returns 执行环境 (上下文)
   */
  prepareContext: (
    additional_context?: Record<string, any>,
    last_message_id?: number,
  ) => Promise<Record<string, any>>;

  /**
   * 检查模板是否存在语法错误
   * 并不会实际执行
   *
   * @param content 模板代码
   * @param output_line_count 发生错误时输出的附近行数; 默认为 4
   * @returns 语法错误信息, 无错误返回空字符串
   */
  getSyntaxErrorInfo: (code: string, output_line_count?: number) => Promise<string>;

  /**
   * 获取全局变量、聊天变量、消息楼层变量的并集
   *
   * @param end_message_id 要合并的消息楼层变量最大楼层数
   * @returns 合并后的变量
   */
  allVariables: (end_message_id?: number) => Record<string, any>;

  /**
   * 设置提示词模板语法插件的设置
   *
   * @param features 设置
   */
  setFeatures: (
    features: Partial<{
      enabled: boolean;
      generate_enabled: boolean;
      generate_loader_enabled: boolean;
      render_enabled: boolean;
      render_loader_enabled: boolean;
      with_context_disabled: boolean;
      debug_enabled: boolean;
      autosave_enabled: boolean;
      preload_worldinfo_enabled: boolean;
      code_blocks_enabled: boolean;
      world_active_enabled: boolean;
      raw_message_evaluation_enabled: boolean;
      filter_message_enabled: boolean;
      cache_enabled: boolean;
    }>,
  ) => void;

  /**
   * 重置提示词模板语法插件的设置
   */
  resetFeatures: () => void;
};
