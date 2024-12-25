import {iframe_client__multimap} from "./_multimap.js"
import {iframe_client_chat_message} from "./chat_message.js"
import {iframe_client_event} from "./event.js"
import {iframe_client_trigger_slash} from "./trigger_slash.js"
import {iframe_client_util} from "./util.js"
import {iframe_client_variables} from "./variables.js"

export const iframe_client = [
  iframe_client__multimap, 
  iframe_client_chat_message, 
  iframe_client_event, 
  iframe_client_trigger_slash, 
  iframe_client_util, 
  iframe_client_variables, 
].join('\n');