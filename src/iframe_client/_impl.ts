export const do_nothing = () => { };

export interface IframeCallbackMessage {
    request: string;
    uid: number;
    result?: any;
}

export async function make_iframe_promise(message: any): Promise<any> {
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event: MessageEvent<IframeCallbackMessage>) {
            if (event.data?.request === (message.request + "_callback") && event.data.uid === uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
            }
        }
        window.addEventListener("message", handleMessage);
        window.parent.postMessage(
            {
                uid: uid,
                ...message,
            },
            "*"
        );
    });
}

export function format_function_to_string(fn: Function): string {
    const string = fn.toString();
    const index = string.indexOf("\n");
    return index > -1 ? string.slice(0, index) : string;
}


// 可选：挂载到全局对象，支持全局直接访问
if (typeof window !== "undefined") {
    const globalObj = window as any;
    globalObj.format_function_to_string = format_function_to_string;
    globalObj.make_iframe_promise = make_iframe_promise;
}
