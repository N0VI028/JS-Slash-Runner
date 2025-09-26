const originalHighlightElement = hljs.highlightElement;

export function optimizeHljs() {
  hljs.highlightElement = (element: HTMLElement) => {
    if ($(element).text().includes('<body')) {
      return;
    }
    originalHighlightElement(element);
  };
}
