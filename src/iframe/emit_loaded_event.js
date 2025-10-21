(function () {
  function emit_loaded_event() {
    parent.postMessage({ type: 'TH_DOM_CONTENT_LOADED', iframe_name: getIframeName() }, '*');
  }
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    emit_loaded_event();
  } else {
    document.addEventListener('DOMContentLoaded', emit_loaded_event, { once: true });
  }
})();
