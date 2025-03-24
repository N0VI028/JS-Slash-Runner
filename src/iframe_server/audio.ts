import { getLogPrefix, IframeMessage, registerIframeHandler } from '@/iframe_server/_impl';
import { audioEnable, audioImport, audioMode, audioPlay, audioSelect } from '@/slash_command/audio';

interface IframeAudioMode extends IframeMessage {
  request: '[Audio][audioMode]';
  type: string;
  mode: string;
}

interface IframeAudioEnable extends IframeMessage {
  request: '[Audio][audioEnable]';
  type: string;
  state?: string;
}

interface IframeAudioPlay extends IframeMessage {
  request: '[Audio][audioPlay]';
  type: string;
  play?: string;
}

interface IframeAudioImport extends IframeMessage {
  request: '[Audio][audioImport]';
  type: string;
  url: string;
  play?: string;
}

interface IframeAudioSelect extends IframeMessage {
  request: '[Audio][audioSelect]';
  type: string;
  url: string;
}

export function registerIframeAudioHandler() {
  registerIframeHandler('[Audio][audioMode]', async (event: MessageEvent<IframeAudioMode>): Promise<void> => {
    const type = event.data.type;
    const mode = event.data.mode;
    await audioMode({ type, mode });
    console.info(`${getLogPrefix(event)} 切换音频模式: ${type}-${mode}`);
  });

  registerIframeHandler('[Audio][audioEnable]', async (event: MessageEvent<IframeAudioEnable>): Promise<void> => {
    const type = event.data.type;
    const state = event.data.state;
    await audioEnable({ type, state });
    console.info(`${getLogPrefix(event)} 切换音频状态: ${type}-${state}`);
  });

  registerIframeHandler('[Audio][audioPlay]', async (event: MessageEvent<IframeAudioPlay>): Promise<void> => {
    const type = event.data.type;
    const play = event.data.play;
    await audioPlay({ type, play });
    console.info(`${getLogPrefix(event)} 切换音频播放状态: ${type}-${play}`);
  });

  registerIframeHandler('[Audio][audioImport]', async (event: MessageEvent<IframeAudioImport>): Promise<void> => {
    const type = event.data.type;
    const url = event.data.url;
    const play = event.data.play;
    await audioImport({ type, play }, url);
    console.info(`${getLogPrefix(event)} 导入音频: ${type}-${url}-${play}`);
  });

  registerIframeHandler('[Audio][audioSelect]', async (event: MessageEvent<IframeAudioSelect>): Promise<void> => {
    const type = event.data.type;
    const url = event.data.url;
    await audioSelect({ type }, url);
    console.info(`${getLogPrefix(event)} 选择音频: ${type}-${url}`);
  });
}
