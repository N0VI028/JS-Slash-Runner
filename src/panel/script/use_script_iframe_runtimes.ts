import { useGlobalScriptsStore } from '@/store/scripts';
import { Script } from '@/type/scripts';
import { sha224 } from 'js-sha256';

interface ScriptRuntime {
  id: string;
  hash: string;
  content: string;
}

function toScriptRuntime(script: Script): ScriptRuntime {
  return {
    id: script.id,
    hash: sha224(script.id + script.content),
    content: script.content,
  };
}

export function useScriptIframeRuntimes(
  app_ready: Ref<boolean>,
  ...stores: ReturnType<typeof useGlobalScriptsStore>[]
) {
  return computed(() => {
    return app_ready.value
      ? _(stores)
          .filter(store => store.enabled)
          .flatMap(store => store.flattened_scripts)
          .filter(script => script.enabled)
          .map(toScriptRuntime)
          .sortBy(script => script.id)
          .value()
      : [];
  });
}
