export { handleTavernEvent };
import { extract, get_or_set } from "../util/helper.js";
import { eventSource } from "../../../../../../script.js";
let iframe_listener_event_callback_map = new Map();
function getIframeName(event) {
    const window = event.source;
    return window.frameElement?.id;
}
function unpack(event) {
    return {
        iframe_name: getIframeName(event),
        listener_name: event.data.listener_name,
        event_type: event.data.event_type,
    };
}
function tryGetTavernCallback(event) {
    const data = unpack(event);
    return iframe_listener_event_callback_map.get(data.iframe_name)?.get(data.listener_name)?.get(data.event_type);
}
function removeTavernCallback(event) {
    const data = unpack(event);
    // @ts-ignore 2345
    iframe_listener_event_callback_map.get(data.iframe_name).get(data.listener_name).delete(data.event_type);
}
function makeTavernCallback(event, once) {
    const data = unpack(event);
    const default_callback = async (...args) => {
        if (once) {
            removeTavernCallback(event);
        }
        event.source?.postMessage({
            request: 'iframe_tavern_callback',
            event_type: data.event_type,
            listener_name: data.listener_name,
            args: args
        }, { targetOrigin: "*" });
    };
    const default_event_callback = new Map([[data.event_type, default_callback]]);
    const default_listener_event_callback = new Map([[data.iframe_name, default_event_callback]]);
    const listener_event_callback = get_or_set(iframe_listener_event_callback_map, data.iframe_name, default_listener_event_callback);
    const event_callback = get_or_set(listener_event_callback, data.listener_name, default_event_callback);
    const callback = get_or_set(event_callback, data.event_type, default_callback);
    return callback;
}
const event_handlers = {
    iframe_tavern_on: (event) => {
        const data = unpack(event);
        if (tryGetTavernCallback(event)) {
            console.warn(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 已经在监听 ${data.event_type} 事件, 调用 tavernOn 无效`);
            return;
        }
        const callback = makeTavernCallback(event, false);
        eventSource.on(data.event_type, callback);
        console.info(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 开始监听酒馆 ${data.event_type} 事件并随事件触发`);
    },
    iframe_tavern_make_last: (event) => {
        const is_listening = tryGetTavernCallback(event) !== undefined;
        const data = unpack(event);
        const callback = makeTavernCallback(event, false);
        eventSource.makeLast(data.event_type, callback);
        if (is_listening) {
            console.info(`[Tavern Event](${data.iframe_name}) 将 ${data.listener_name} 调整为监听到酒馆 ${data.event_type} 事件时最后触发`);
        }
        else {
            console.info(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 开始监听酒馆 ${data.event_type} 事件并随事件最后触发`);
        }
    },
    iframe_tavern_make_first: (event) => {
        const is_listening = tryGetTavernCallback(event) !== undefined;
        const data = unpack(event);
        const callback = makeTavernCallback(event, false);
        eventSource.makeFirst(data.event_type, callback);
        if (is_listening) {
            console.info(`[Tavern Event](${data.iframe_name}) 将 ${data.listener_name} 调整为监听到酒馆 ${data.event_type} 事件时最先触发`);
        }
        else {
            console.info(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 开始监听酒馆 ${data.event_type} 事件并随事件最先触发`);
        }
    },
    iframe_tavern_once: (event) => {
        const data = unpack(event);
        if (tryGetTavernCallback(event)) {
            console.warn(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 已经在监听 ${data.event_type} 事件, 调用 tavernOnce 无效`);
            return;
        }
        const callback = makeTavernCallback(event, true);
        eventSource.once(data.event_type, callback);
        console.info(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 开始监听下一次酒馆 ${data.event_type} 事件并仅在该次事件时触发`);
    },
    iframe_tavern_remove_listener: (event) => {
        const data = unpack(event);
        const callback = tryGetTavernCallback(event);
        if (!callback) {
            console.warn(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 没有监听 ${data.event_type} 事件, 调用 tavernRemoveListener 无效`);
            return;
        }
        eventSource.removeListener(data.event_type, callback);
        removeTavernCallback(event);
        console.info(`[Tavern Event](${data.iframe_name}) ${data.listener_name} 不再监听酒馆 ${data.event_type} 事件`);
    },
    iframe_tavern_clear_event: (event) => {
        const iframe_name = getIframeName(event);
        const event_type = event.data.event_type;
        iframe_listener_event_callback_map
            .get(iframe_name)
            ?.forEach((event_callback_map, _) => {
            const callback = event_callback_map.get(event_type);
            if (callback) {
                eventSource.removeListener(event_type, callback);
                event_callback_map.delete(event_type);
            }
        });
        console.info(`[Tavern Event](${iframe_name}) 所有函数都不再监听酒馆 ${event_type} 事件`);
    },
    iframe_tavern_clear_listener: (event) => {
        const iframe_name = getIframeName(event);
        const listener_name = event.data.listener_name;
        const listener_event_callback_map = iframe_listener_event_callback_map.get(iframe_name);
        if (listener_event_callback_map) {
            const event_callback_map = extract(listener_event_callback_map, listener_name);
            if (event_callback_map) {
                event_callback_map.forEach((callback, event_type) => {
                    eventSource.removeListener(event_type, callback);
                });
            }
        }
        console.info(`[Tavern Event](${iframe_name}) ${listener_name} 不再监听任何酒馆事件`);
    },
    iframe_tavern_clear_all: (event) => {
        const iframe_name = getIframeName(event);
        clearIframeTavernEventListeners(iframe_name);
        console.info(`[Tavern Event](${iframe_name}) 取消监听所有酒馆事件`);
    },
};
function clearIframeTavernEventListeners(iframe_name) {
    const listener_event_callback_map = extract(iframe_listener_event_callback_map, iframe_name);
    listener_event_callback_map
        ?.forEach((event_callback_map, _) => {
        event_callback_map.forEach((callback, event_type) => {
            eventSource.removeListener(event_type, callback);
        });
    });
}
const event_observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
            if (node instanceof HTMLIFrameElement) {
                clearIframeTavernEventListeners(node.id);
            }
        });
    });
});
event_observer.observe(document.body, { childList: true, subtree: true });
async function handleTavernEvent(event) {
    if (!event.data)
        return;
    try {
        const handler = event_handlers[event.data.request];
        if (handler) {
            handler(event);
        }
    }
    catch (error) {
        console.error(`[Tavern Event](${event.source}) 与酒馆事件交互时出错:`, error);
        throw error;
    }
}
//# sourceMappingURL=tavern_event.js.map