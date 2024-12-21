import { iframe_client_message_pass } from "./message_pass.js";
import { iframe_client_slash_command } from "./slash_command.js";
import { iframe_client_tavern_event } from "./tavern_event.js";
import { iframe_client_variables } from "./variables.js";
export const iframe_client = [
    iframe_client_message_pass,
    iframe_client_slash_command,
    iframe_client_tavern_event,
    iframe_client_variables,
].join('\n');
//# sourceMappingURL=index.js.map