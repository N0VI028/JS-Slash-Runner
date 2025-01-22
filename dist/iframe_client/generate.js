"use strict";
async function generateRequest(event) {
    return detail.make_iframe_promise({
        request: 'iframe_generate',
        userInput: event.userInput,
        usePreset: event.usePreset,
        promptConfig: event.promptConfig,
    });
}
//# sourceMappingURL=generate.js.map