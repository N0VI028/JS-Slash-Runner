// TODO: 导入 index 时使用 raw, 而不是分别使用 raw
import _impl from "@/iframe_client/_impl?raw";
import _multimap from "@/iframe_client/_multimap?raw";
import event from "@/iframe_client/event?raw";
import util from '@/iframe_client/util?raw';
import variables from '@/iframe_client/variables?raw';

export const iframe_client = [
  _impl,
  _multimap,
  event,
  variables,
  util,
].join('\n');

export const window_functions = `
  SillyTavern = window.parent.SillyTavern.getContext();
  TavernHelper = window.parent.TavernHelper;
  for (const key in TavernHelper) {
    window[key] = TavernHelper[key];
  }
`;
