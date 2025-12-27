(function () {
  const IS_BLOB_MODE = window.location.protocol === 'blob:';

  let scheduled = false;

  function measureAndPost() {
    scheduled = false;
    try {
      const doc = window.document;
      const body = doc.body;
      const html = doc.documentElement;
      if (!body || !html) {
        return;
      }

      let height = 0;
      if (IS_BLOB_MODE) {
        // blob 模式: 使用子元素高度算法
        const children = Array.from(body.children || []);
        if (children.length > 0) {
          const body_rect = body.getBoundingClientRect();
          const body_style = window.getComputedStyle(body);
          const padding_top = parseFloat(body_style.paddingTop) || 0;
          const padding_bottom = parseFloat(body_style.paddingBottom) || 0;

          let max_top = Infinity;
          let max_bottom = -Infinity;

          for (const el of children) {
            if (!(el instanceof HTMLElement)) continue;
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            const position = style.position;
            // 只计算正常文档流中占空间的元素，绝对定位/固定定位不参与高度计算
            if (position === 'absolute' || position === 'fixed') {
              continue;
            }

            const margin_top = parseFloat(style.marginTop) || 0;
            const margin_bottom = parseFloat(style.marginBottom) || 0;

            const top_with_margin = rect.top - margin_top - body_rect.top;
            const bottom_with_margin = rect.bottom + margin_bottom - body_rect.top;

            if (Number.isFinite(top_with_margin) && top_with_margin < max_top) {
              max_top = top_with_margin;
            }
            if (Number.isFinite(bottom_with_margin) && bottom_with_margin > max_bottom) {
              max_bottom = bottom_with_margin;
            }
          }

          if (Number.isFinite(max_top) && Number.isFinite(max_bottom) && max_bottom > max_top) {
            const content_height = max_bottom - max_top;
            const total_height = content_height + padding_top + padding_bottom;
            if (Number.isFinite(total_height) && total_height > 0) {
              height = total_height;
            }
          }
        }

        if (!Number.isFinite(height) || height <= 0) {
          height = body.scrollHeight;
        }
      } else {
        // srcdoc 模式: 只用 body.scrollHeight
        height = body.scrollHeight;
      }

      if (!Number.isFinite(height) || height <= 0) {
        return;
      }

      window.parent.postMessage({ type: 'TH_ADJUST_IFRAME_HEIGHT', iframe_name: getIframeName(), height: height }, '*');
    } catch {
      //
    }
  }
  const throttledMeasureAndPost = _.throttle(measureAndPost, 500);

  function postIframeHeight() {
    if (scheduled) {
      return;
    }
    scheduled = true;

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(measureAndPost);
    } else {
      throttledMeasureAndPost();
    }
  }

  function observeHeightChange() {
    const body = document.body;
    if (!body) {
      return;
    }

    const resize_observer = new ResizeObserver(entries => {
      postIframeHeight();
    });
    resize_observer.observe(body);

    if (IS_BLOB_MODE) {
      const mutation_observer = new MutationObserver(entries => {
        resize_observer.disconnect();

        for (const element of body.children) {
          resize_observer.observe(element);
        }
        resize_observer.observe(body);
        postIframeHeight();
      });
      mutation_observer.observe(body, { childList: true, subtree: true, attributes: true });
    }
  }

  $(() => {
    postIframeHeight();
    observeHeightChange();
  });
})();
