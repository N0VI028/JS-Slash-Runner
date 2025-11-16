(function () {
  const iframe_name = getIframeName();

  _th_impl._init(iframe_name);

  function override(level) {
    const original = console[level];
    console[level] = (...args) => {
      _th_impl._log(iframe_name, level, ...args);
      original(...args);
    };
  }
  override('log');
  override('debug');
  override('info');
  override('warn');
  override('error');

  $(window).on('pagehide', () => {
    _th_impl._clearLog(iframe_name);
  });
})();
