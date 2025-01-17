import { characters, this_chid } from "../../../../../../script.js";
// @ts-ignore
import { selected_group } from "../../../../../group-chats.js";
import { getCharaFilename, onlyUnique } from "../../../../../utils.js";
import { createNewWorldInfo, deleteWorldInfo, getWorldInfoSettings, world_info, world_names } from "../../../../../world-info.js";

import { findChar } from "../compatibility.js"
import { getIframeName, IframeMessage, registerIframeHandler } from "./index.js";

interface IframeGetLorebookSettings extends IframeMessage {
  request: 'iframe_get_lorebook_settings';
}

interface IframeGetCharLorebooks extends IframeMessage {
  request: "iframe_get_char_lorebooks";
  option: GetCharLorebooksOption;
}

interface IframeGetLorebooks extends IframeMessage {
  request: "iframe_get_lorebooks";
}

interface IframeDeleteLorebook extends IframeMessage {
  request: "iframe_delete_lorebook";
  lorebook: string;
}

interface IframeCreateLorebook extends IframeMessage {
  request: "iframe_create_lorebook";
  lorebook: string;
}

function toLorebookSettings(world_info_settings: ReturnType<typeof getWorldInfoSettings>): LorebookSettings {
  return {
    selected_global_lorebooks: (world_info_settings.world_info as { globalSelect: string[] }).globalSelect,

    scan_depth: world_info_settings.world_info_depth,
    context_percentage: world_info_settings.world_info_budget,
    budget_cap: world_info_settings.world_info_budget_cap,
    min_activations: world_info_settings.world_info_min_activations,
    max_depth: world_info_settings.world_info_min_activations_depth_max,
    max_recursion_steps: world_info_settings.world_info_max_recursion_steps,

    insertion_strategy: ({ 0: 'evenly', 1: 'character_first', 2: 'global_first' }[world_info_settings.world_info_character_strategy]) as 'evenly' | 'character_first' | 'global_first',

    include_names: world_info_settings.world_info_include_names,
    recursive: world_info_settings.world_info_recursive,
    case_sensitive: world_info_settings.world_info_case_sensitive,
    match_whole_words: world_info_settings.world_info_match_whole_words,
    use_group_scoring: world_info_settings.world_info_use_group_scoring,
    overflow_alert: world_info_settings.world_info_overflow_alert,
  };
}

export function registerIframeLorebookHandler() {
  registerIframeHandler(
    'iframe_get_lorebook_settings',
    async (event: MessageEvent<IframeGetLorebookSettings>): Promise<LorebookSettings> => {
      const iframe_name = getIframeName(event);

      const lorebook_settings = toLorebookSettings(getWorldInfoSettings());

      console.info(`[Lorebook][getLorebookSettings](${iframe_name}) 获取世界书全局设置: ${JSON.stringify(lorebook_settings)}`);
      return lorebook_settings;
    },
  );

  registerIframeHandler(
    'iframe_get_char_lorebooks',
    async (event: MessageEvent<IframeGetCharLorebooks>): Promise<string[]> => {
      const iframe_name = getIframeName(event);
      const option = event.data.option;
      if (!['all', 'primary', 'additional'].includes(option.type as string)) {
        throw Error(`[Lorebook][getCharLorebooks](${iframe_name}) 提供的 type 无效, 请提供 'all', 'primary' 或 'additional', 你提供的是: ${option.type}`);
      }

      // @ts-ignore
      if (selected_group && !option.name) {
        throw Error(`[Lorebook][getCharLorebooks](${iframe_name}) 不要在群组中调用这个功能`);
      }
      option.name = option.name ?? characters[this_chid]?.avatar ?? null;
      // @ts-ignore
      const character = findChar({ name: option.name });
      if (!character) {
        throw Error(`[Lorebook][getCharLorebooks](${iframe_name}) 未找到名为 '${option.name}' 的角色卡`);
      }

      let books: string[] = [];
      if (option.type === 'all' || option.type === 'primary') {
        books.push(character.data?.extensions?.world);
      }
      if (option.type === 'all' || option.type === 'additional') {
        const fileName = getCharaFilename(characters.indexOf(character));
        // @ts-ignore 2339
        const extraCharLore = world_info.charLore?.find((e) => e.name === fileName);
        if (extraCharLore && Array.isArray(extraCharLore.extraBooks)) {
          books.push(...extraCharLore.extraBooks);
        }
      }

      books = books.filter(onlyUnique);

      console.info(`[Lorebook][getCharLorebooks](${iframe_name}) 获取角色卡绑定的世界书, 选项: ${JSON.stringify(option)}, 获取结果: ${JSON.stringify(books)}`);
      return books;
    },
  );

  registerIframeHandler(
    'iframe_get_lorebooks',
    async (event: MessageEvent<IframeGetLorebooks>): Promise<string[]> => {
      const iframe_name = getIframeName(event);

      console.info(`[Lorebook][getLorebooks](${iframe_name}) 获取世界书列表: ${JSON.stringify(world_names)}`);
      return world_names;
    },
  );

  registerIframeHandler(
    'iframe_delete_lorebook',
    async (event: MessageEvent<IframeDeleteLorebook>): Promise<boolean> => {
      const iframe_name = getIframeName(event);
      const lorebook = event.data.lorebook;

      const success = await deleteWorldInfo(lorebook);

      console.info(`[Lorebook][deleteLorebook](${iframe_name}) 移除世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
      return success;
    },
  );

  registerIframeHandler(
    'iframe_create_lorebook',
    async (event: MessageEvent<IframeCreateLorebook>): Promise<boolean> => {
      const iframe_name = getIframeName(event);
      const lorebook = event.data.lorebook;

      const success = await createNewWorldInfo(lorebook, { interactive: false });

      console.info(`[Lorebook][createLorebook](${iframe_name}) 新建世界书 '${lorebook}' ${success ? '成功' : '失败'}`);
      return success;
    },
  );
}
