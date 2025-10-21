(function () {
  function emit_loaded_event() {
    window.parent.postMessage({ type: 'TH_DOM_CONTENT_LOADED', iframe_name: getIframeName() }, '*');
  }

  if (window.document.readyState === 'loading') {
    window.document.addEventListener('DOMContentLoaded', emit_loaded_event, { once: true });
  } else {
    emit_loaded_event();
  }
})();
