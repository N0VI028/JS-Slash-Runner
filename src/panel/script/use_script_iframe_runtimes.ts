import { useGlobalScriptsStore } from '@/store/scripts';
import { isScript, Script } from '@/type/scripts';
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

function flatScripts(store: ReturnType<typeof useGlobalScriptsStore>): ScriptRuntime[] {
  if (!store.enabled) {
    return [];
  }
  return _(store.script_trees)
    .flatMap(script => {
      if (isScript(script)) {
        return script.enabled ? [toScriptRuntime(script)] : [];
      }
      return script.scripts.filter(script => script.enabled).map(toScriptRuntime);
    })
    .value();
}

export function useScriptIframeRuntimes(
  app_ready: Ref<boolean>,
  ...stores: ReturnType<typeof useGlobalScriptsStore>[]
) {
  return computed(() => {
    return app_ready.value
      ? _(stores)
          .flatMap(flatScripts)
          .sortBy(script => script.id)
          .value()
      : [];
  });
}
