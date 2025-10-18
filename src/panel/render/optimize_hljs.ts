const originalHighlightElement = hljs.highlightElement;

function optimizeHljs() {
  hljs.highlightElement = (element: HTMLElement) => {
    if ($(element).text().includes('<body')) {
      return;
    }
    originalHighlightElement(element);
  };
}

function deoptimizeHljs() {
  hljs.highlightElement = originalHighlightElement;
}

export function useOptimizeHljs(enabled: Readonly<Ref<boolean>>) {
  watch(
    enabled,
    (value, old_value) => {
      if (value) {
        optimizeHljs();
        return;
      }
      if (!value && old_value) {
        deoptimizeHljs();
      }
    },
    { immediate: true },
  );
}
