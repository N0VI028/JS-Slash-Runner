export const IS_UNSUPPORTED_BROWSER = (() => {
  const ua = navigator.userAgent.toLowerCase();
  return /quark/.test(ua);
})();

export function isUnsupportedBrowser(): boolean {
  return IS_UNSUPPORTED_BROWSER;
}