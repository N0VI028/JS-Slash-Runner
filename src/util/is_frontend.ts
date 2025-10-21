export function isFrontend(content: string): boolean {
  return ['html>', '<head>', '<body'].some(tag => content.includes(tag));
}
