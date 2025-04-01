async function getCharData(name: string, allowAvatar: boolean = false): Promise<any> {
  return TavernHelper.getCharData(name, allowAvatar);
}

async function getCharAvatarPath(name: string, allowAvatar: boolean = false): Promise<any> {
  return TavernHelper.getCharAvatarPath(name, allowAvatar);
}

async function getChatHistoryBrief(name: string, allowAvatar: boolean = false): Promise<any[]> {
  return TavernHelper.getChatHistoryBrief(name, allowAvatar);
}

async function getChatHistoryDetail(data: any[], isGroupChat: boolean = false): Promise<object> {
  return TavernHelper.getChatHistoryDetail(data, isGroupChat);
}




