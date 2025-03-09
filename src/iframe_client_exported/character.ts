export const iframe_client_character = `
async function getCharCardData(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][getCharCardData]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
async function getCharAvatarPath(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][getCharAvatarPath]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
async function getChatHistoryBrief(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][getChatHistoryBrief]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
async function getChatHistoryDetail(data, isGroupChat = false) {
    return detail.make_iframe_promise({
        request: '[Character][getChatHistoryDetail]',
        data: data,
        isGroupChat: isGroupChat,
    });
}
`