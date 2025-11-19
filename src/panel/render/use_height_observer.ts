export function adjustIframeHeight(iframe: HTMLIFrameElement) {
  if (!iframe.contentWindow) {
    return;
  }
  const document = iframe.contentWindow.document;

  const height = Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
  if (!Number.isFinite(height) || height <= 0) {
    return;
  }

  iframe.style.height = `${height}px`;
  iframe.contentWindow.postMessage({ type: 'TH_UPDATE_VIEWPORT_HEIGHT' }, '*');
}

const observed_elements = new Map<Element, HTMLIFrameElement>();

const observer = new ResizeObserver(entries => {
  for (const entry of entries) {
    const element = entry.target;
    const iframe = observed_elements.get(element);
    if (iframe) {
      adjustIframeHeight(iframe);
    }
  }
});

export function useHeightObserver() {
  return {
    observe: (iframe: HTMLIFrameElement) => {
      if (!iframe.contentWindow) {
        return;
      }
      const body = iframe.contentWindow.document.body;
      observed_elements.set(body, iframe);
      observer.observe(body);
      adjustIframeHeight(iframe);
    },
    unobserve: (iframe: HTMLIFrameElement) => {
      if (!iframe.contentWindow) {
        return;
      }
      const body = iframe.contentWindow.document.body;
      observed_elements.delete(body);
      observer.unobserve(body);
    },
  };
}
