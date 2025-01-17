namespace detail {
  export const do_nothing = () => { };

  export interface IframeCallbackMessage {
    request: string;
    uid: number;
    result?: any;
  };

  export async function makeIframePromise(message: any): Promise<any> {
    return new Promise((resolve, _) => {
      const uid = Date.now() + Math.random();
      function handleMessage(event: MessageEvent<IframeCallbackMessage>) {
        if (event.data?.request === (message.request + "_callback") && event.data.uid == uid) {
          window.removeEventListener("message", handleMessage);
          resolve(event.data.result);
        }
      }
      window.addEventListener("message", handleMessage);
      window.parent.postMessage({
        uid: uid,
        ...message,
      }, "*");
    });
  }
}
