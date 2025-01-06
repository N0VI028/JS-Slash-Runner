export const IS_UNSUPPORTED_BROWSER = (async () => {
    try {
        const testHtml = '<html><body>test</body></html>';
        const blob = new Blob([testHtml], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        iframe.src = blobUrl;
        await new Promise((resolve, reject) => {
            iframe.onload = resolve;
            iframe.onerror = reject;
            setTimeout(reject, 1000);
        });
        URL.revokeObjectURL(blobUrl);
        iframe.remove();
        return false; 
    }
    catch (err) {
        console.warn('浏览器不支持blob iframe,将使用srcdoc替代', err);
        return true; 
    }
})();
export function isUnsupportedBrowser() {
    return IS_UNSUPPORTED_BROWSER;
}
//# sourceMappingURL=ua_detect.js.map