window._ = window.parent._;
let result = _(window);
result = result.set('SillyTavern', _.get(window.parent, 'SillyTavern').getContext());
result = result.merge(_.pick(window.parent, ['EjsTemplate', 'Mvu', 'TavernHelper', 'YAML', 'toastr', 'z']));
result = result.merge(result.get('TavernHelper'));
result = result.merge(
  ...Object.entries(result.get('TavernHelper')._bind).map(([key, value]) => ({
    [key.replace('_', '')]: value.bind(window),
  })),
);
result.value();

$(window).on('pagehide', eventClearAll);
