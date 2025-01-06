export const IS_UNSUPPORTED_BROWSER = (() => {
    const ua = navigator.userAgent.toLowerCase();
    return /quark/.test(ua);
})();
export function isUnsupportedBrowser() {
    return IS_UNSUPPORTED_BROWSER;
}
//# sourceMappingURL=ua_detect.js.map