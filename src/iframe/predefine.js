window._ = window.parent._;
let result = _(window);
result = result.set('SillyTavern', _.get(window.parent, 'SillyTavern').getContext());
result = result.merge(_.pick(window.parent, ['EjsTemplate', 'Mvu', 'TavernHelper', 'YAML', 'showdown', 'toastr', 'z']));
result = result.merge(_.get(window.parent, 'TavernHelper'));
result = result.merge(
  ...Object.entries(_.get(window.parent, 'TavernHelper')._bind).map(([key, value]) => ({
    [key.replace('_', '')]: value.bind(window),
  })),
);
result.value();

$(window).on('pagehide', eventClearAll);
