async function findCharacter(name: string, allowAvatar: boolean = false): Promise<any> {
  return detail.make_iframe_promise({
    request: '[Character][findCharacter]',
    name: name,
    allowAvatar: allowAvatar,
  });
}

async function getCardData(name: string, allowAvatar: boolean = false): Promise<any> {
  return detail.make_iframe_promise({
    request: '[Character][getCardData]',
    name: name,
    allowAvatar: allowAvatar,
  });
}

async function getCharAvatarPath(name: string, allowAvatar: boolean = false): Promise<any> {
  return detail.make_iframe_promise({
    request: '[Character][getCharAvatarPath]',
    name: name,
    allowAvatar: allowAvatar,
  });
}

