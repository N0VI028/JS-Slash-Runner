type AudioType = 'bgm' | 'ambient';

type AudioMode = 'repeat' | 'stop' | 'random' | 'single';

interface AudioModeParams {
  type: AudioType;
  mode: AudioMode;
}

interface AudioEnableParams {
  type: AudioType;
  state?: string;
}

interface AudioPlayParams {
  type: AudioType;
  play?: string;
}

interface AudioImportParams {
  type: AudioType;
  play?: string;
}

interface AudioSelectParams {
  type: AudioType;
}

async function audioMode(params: AudioModeParams) {
  return TavernHelper.audioMode(params);
}

async function audioEnable(params: AudioEnableParams) {
  return TavernHelper.audioEnable(params);
}

async function audioPlay(params: AudioPlayParams) {
  return TavernHelper.audioPlay(params);
}

async function audioImport(params: AudioImportParams, url: string) {
  return TavernHelper.audioImport(params, url);
}

async function audioSelect(params: AudioSelectParams, url: string) {
  return TavernHelper.audioSelect(params, url);
}
