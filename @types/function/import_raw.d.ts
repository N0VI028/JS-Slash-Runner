/**
 * 像酒馆界面里那样导入角色卡
 *
 * @param filename 角色卡名
 * @param content 角色卡文件内容
 */
declare function importRawCharacter(filename: string, content: Blob): Promise<Response>;

/**
 * 像酒馆界面里那样导入聊天文件, 目前仅能导入到当前选择的角色卡
 *
 * @param filename 聊天名, 由于酒馆限制, 它实际不会作为最终导入的聊天文件名称
 * @param content 聊天文件内容
 */
declare function importRawChat(filename: string, content: string): Promise<Response>;

/**
 * 像酒馆界面里那样导入预设
 *
 * @param filename 预设名
 * @param content 预设文件内容
 */
declare function importRawPreset(filename: string, content: string): Promise<Response>;

/**
 * 像酒馆界面里那样导入世界书
 *
 * @param filename 世界书名
 * @param content 世界书文件内容
 */
declare function importRawWorldbook(filename: string, content: string): Promise<Response>;

/**
 * 像酒馆界面里那样导入酒馆正则
 *
 * @param filename 酒馆正则名
 * @param content 酒馆正则文件内容
 */
declare function importRawTavernRegex(filename: string, content: string): boolean;
