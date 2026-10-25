/**
 * 从 `酒馆存档文件夹/users/files/` 文件夹内获取文件内容
 * @param filename 文件名
 * @returns 文件内容的 Response 对象, 随后可根据具体文件类型使用 `.text()` 或 `.json()` 等方法使用文件内容
 *
 * @example
 * // 获取 `酒馆存档文件夹/users/files/CV-vibes.json` 文件
 * getTavernFile('CV-vibes.json')
 */
declare function getTavernFile(filename: string): Promise<Response>;

/**
 * 将 `base64` 存储的文件数据以 `name` 为文件名上传到 `酒馆存档文件夹/users/files/` 文件夹内
 *
 * @param filename 期望的文件名
 * @param base64 文件内容的 base64 编码字符串
 *
 * @returns 实际存储的文件名
 *
 * @throws 如果上传失败, 会抛出异常
 *
 * @example
 * // 上传一个名为 `CV-vibes.json` 的文件
 * uploadTavernFile('CV-vibes.json', 'eyJmb28iOiAiYmFyIn0=')
 */
declare function uploadTavernFile(filename: string, base64: string): Promise<string>;

/**
 * 从 `酒馆存档文件夹/users/files/` 文件夹内删除指定文件
 *
 * @param filename 要删除的文件名
 *
 * @returns 如果文件存在且删除成功则返回 true; 如果文件不存在则返回 false
 *
 * @throws 如果删除失败, 会抛出异常
 *
 * @example
 * // 删除 `酒馆存档文件夹/users/files/CV-vibes.json` 文件
 * deleteTavernFile('CV-vibes.json')
 */
declare function deleteTavernFile(filename: string): Promise<boolean>;
