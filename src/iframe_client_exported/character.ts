export const iframe_client_character = `
async function findCharacter(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][findCharacter]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
async function getCardData(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][getCardData]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
async function getAvatarPath(name, allowAvatar = false) {
    return detail.make_iframe_promise({
        request: '[Character][getAvatarPath]',
        name: name,
        allowAvatar: allowAvatar,
    });
}
`