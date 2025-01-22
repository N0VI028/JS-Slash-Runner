export const iframe_client_generate = `
async function generateRequest(event) {
    return detail.make_iframe_promise({
        request: 'iframe_generate',
        userInput: event.userInput,
        usePreset: event.usePreset,
        promptConfig: event.promptConfig,
    });
}
`