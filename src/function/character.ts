import { TavernRegex } from '@/function/tavern_regex';

// TODO: 角色卡头像
type Character = {
  name: string;
  version: string;
  creator: string;
  creator_notes: string;

  description: string;
  first_messages: string[];

  worldbook: {
    primary: string | null;
    additional: string[];
  };

  extensions: {
    regex_scripts?: TavernRegex[];
    tavern_helper?: {
      scripts: Record<string, any>[];
      variales: Record<string, any>;
    };
    [other: string]: any;
  };
};
