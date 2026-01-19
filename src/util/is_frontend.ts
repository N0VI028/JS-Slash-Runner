export function isFrontend(content: string): boolean {
  return ['html>', '<head>', '<body'].some(tag => content.includes(tag));
}

export function isFrontendElement(element: HTMLElement): boolean {
  const $element = $(element);
  return $element.hasClass('TH-render') || ($element.is('pre') && isFrontend($element.text()));
}
