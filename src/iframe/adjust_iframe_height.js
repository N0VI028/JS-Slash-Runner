(function () {
  /**
   * 通过向父页面发送消息，通知父页面 iframe 高度变化
   */
  const MIN_HEIGHT_DELTA = 2; 
  let lastHeight = 0;
  let scheduled = false;

  function measureAndPost() {
    scheduled = false;
    try {
      const doc = window.document;
      const body = doc.body;
      const html = doc.documentElement;
      if (!body || !html) return;

      const height = Math.max(
        body.scrollHeight,
        html.scrollHeight,
        body.offsetHeight,
        html.offsetHeight,
        html.clientHeight,
      );
      if (!Number.isFinite(height) || height <= 0) {
        return;
      }

      if (Math.abs(height - lastHeight) < MIN_HEIGHT_DELTA) {
        return;
      }
      lastHeight = height;

      window.parent.postMessage({ type: 'TH_DOM_CONTENT_LOADED', iframe_name: getIframeName(), height: height }, '*');
    } catch {
      // 
    }
  }


  function postIframeHeight() {
    if (scheduled) return;
    scheduled = true;

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(measureAndPost);
    } else {
      setTimeout(measureAndPost, 20);
    }
  }

  function observeHeightChange() {
    if (typeof ResizeObserver === 'undefined') {
      postIframeHeight();
      return;
    }
    if (!document.body) return;

    const observer = new ResizeObserver(() => {
      postIframeHeight();
    });
    observer.observe(document.body);
  }

  function init() {
    postIframeHeight();
    observeHeightChange();
  }

  if (window.document.readyState === 'loading') {
    window.document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

