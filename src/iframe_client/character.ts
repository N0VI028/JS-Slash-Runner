async function getCharCardData(name: string, allowAvatar: boolean = false): Promise<any> {
  return detail.make_iframe_promise({
    request: '[Character][getCharCardData]',
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

async function getChatHistoryBrief(name: string, allowAvatar: boolean = false): Promise<any[]> {
  return detail.make_iframe_promise({
    request: '[Character][getChatHistoryBrief]',
    name: name,
    allowAvatar: allowAvatar,
  });
}

async function getChatHistoryDetail(data: any[], isGroupChat: boolean = false): Promise<object> {
  return detail.make_iframe_promise({
    request: '[Character][getChatHistoryDetail]',
    data: data,
    isGroupChat: isGroupChat,
  });
}




