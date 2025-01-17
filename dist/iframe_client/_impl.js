"use strict";
var detail;
(function (detail) {
    detail.do_nothing = () => { };
    ;
    async function make_iframe_promise(message) {
        return new Promise((resolve, _) => {
            const uid = Date.now() + Math.random();
            function handleMessage(event) {
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
    detail.make_iframe_promise = make_iframe_promise;
})(detail || (detail = {}));
//# sourceMappingURL=_impl.js.map