export const iframe_client_generate = `
async function generateRequest(event) {
    await detail.make_iframe_promise({
        request: 'iframe_generate',
        option: {
            ...event
        }
    });
}
`