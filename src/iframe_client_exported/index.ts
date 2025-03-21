import {iframe_client__impl} from "./_impl.js"
import {iframe_client__multimap} from "./_multimap.js"
import {iframe_client_audio} from "./audio.js"
import {iframe_client_character} from "./character.js"
import {iframe_client_chat_message} from "./chat_message.js"
import {iframe_client_displayed_message} from "./displayed_message.js"
import {iframe_client_event} from "./event.js"
import {iframe_client_exported} from "./exported.js"
import {iframe_client_frontend_version} from "./frontend_version.js"
import {iframe_client_generate} from "./generate.js"
import {iframe_client_lorebook} from "./lorebook.js"
import {iframe_client_lorebook_entry} from "./lorebook_entry.js"
import {iframe_client_slash} from "./slash.js"
import {iframe_client_tavern_regex} from "./tavern_regex.js"
import {iframe_client_util} from "./util.js"
import {iframe_client_variables} from "./variables.js"

export const iframe_client = [
  iframe_client__impl, 
  iframe_client__multimap, 
  iframe_client_audio, 
  iframe_client_character, 
  iframe_client_chat_message, 
  iframe_client_displayed_message, 
  iframe_client_event, 
  iframe_client_exported, 
  iframe_client_frontend_version, 
  iframe_client_generate, 
  iframe_client_lorebook, 
  iframe_client_lorebook_entry, 
  iframe_client_slash, 
  iframe_client_tavern_regex, 
  iframe_client_util, 
  iframe_client_variables, 
].join('\n');