export function isFrontend(content: string): boolean {
  return ['html>', '<head>', '<body'].some(tag => content.includes(tag));
}

export function isFrontendElement(element: HTMLElement): boolean {
  const $element = $(element);
  return $element.hasClass('TH-render') || ($element.is('pre') && isFrontend($element.text()));
}

export function containsFrontendElement(element: HTMLElement): boolean {
  const $element = $(element);
  return (
    isFrontendElement($element[0]) ||
    $element.find('div.TH-render').length > 0 ||
    $element.find('pre').filter((_, pre) => isFrontendElement(pre)).length > 0
  );
}
