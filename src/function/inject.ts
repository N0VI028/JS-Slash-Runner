import { iframe_events, tavern_events } from '@/function/event';
import { eventSource, extension_prompts, setExtensionPrompt } from '@sillytavern/script';
import { uuidv4 } from '@sillytavern/scripts/utils';

export type InjectionPrompt = {
  id: string;
  position: 'in_chat' | 'none';
  depth: number;

  role: 'system' | 'assistant' | 'user';
  content: string;

  filter?: (() => boolean) | (() => Promise<boolean>);
  should_scan?: boolean;
};

type injectPromptsOptions = {
  once?: boolean;
};

export function injectPrompts(prompts: InjectionPrompt[], { once = false }: injectPromptsOptions = {}) {
  prompts.forEach(prompt =>
    setExtensionPrompt(
      prompt.id ?? uuidv4(),
      prompt.content ?? '',
      prompt.position === 'none' ? -1 : 1,
      prompt.depth ?? 0,
      prompt.should_scan ?? false,
      { system: 0, user: 1, assistant: 2 }[prompt.role ?? 'system'],
      // @ts-expect-error `null` 按照实际接口是可行的
      prompt.filter ?? null,
    ),
  );

  let deleted = false;
  const uninject = () => {
    if (deleted) {
      return;
    }
    uninjectPrompts(prompts.map(p => p.id));
    deleted = true;
  };

  if (once) {
    eventSource.once(iframe_events.GENERATION_ENDED, uninject);
    eventSource.once(tavern_events.GENERATION_ENDED, uninject);
    eventSource.once(tavern_events.GENERATION_STOPPED, uninject);
  }

  return {
    uninject,
  };
}

export function uninjectPrompts(ids: string[]) {
  ids.forEach(k => {
    _.unset(extension_prompts, k);
  });
}
