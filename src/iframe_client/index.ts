// TODO: 导入 index 时使用 raw, 而不是分别使用 raw
import _impl from "@/iframe_client/_impl?raw"
import _multimap from "@/iframe_client/_multimap?raw"
import audio from "@/iframe_client/audio?raw"
import character from "@/iframe_client/character?raw"
import chat_message from "@/iframe_client/chat_message?raw"
import displayed_message from "@/iframe_client/displayed_message?raw"
import event from "@/iframe_client/event?raw"
import exported from "@/iframe_client/exported?raw"
import frontend_version from "@/iframe_client/frontend_version?raw"
import generate from "@/iframe_client/generate?raw"
import lorebook from "@/iframe_client/lorebook?raw"
import lorebook_entry from "@/iframe_client/lorebook_entry?raw"
import slash from "@/iframe_client/slash?raw"
import tavern_regex from "@/iframe_client/tavern_regex?raw"
import util from "@/iframe_client/util?raw"
import variables from "@/iframe_client/variables?raw"

export const iframe_client = [
  _impl,
  _multimap,
  audio,
  character,
  chat_message,
  displayed_message,
  event,
  exported,
  frontend_version,
  generate,
  lorebook,
  lorebook_entry,
  slash,
  tavern_regex,
  util,
  variables,
].join('\n');
