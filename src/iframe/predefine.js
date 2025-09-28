let result = _(window);
result = result.set('SillyTavern', _.get(window.parent, 'SillyTavern').getContext());
result = result.set('TavernHelper', _.get(window.parent, 'TavernHelper'));
result = result.set('toastr', _.get(window.parent, 'toastr'));
result = result.set('YAML', _.get(window.parent, 'YAML'));
result = result.set('z', _.get(window.parent, 'z'));
if (_.get(window.parent, 'EjsTemplate')) {
  result = result.set('EjsTemplate', _.get(window.parent, 'EjsTemplate'));
}
if (_.get(window.parent, 'Mvu')) {
  result = result.set('Mvu', _.get(window.parent, 'Mvu'));
}
result = result.merge(result.get('TavernHelper'));
result = result.merge(
  ...Object.entries(result.get('TavernHelper')._bind).map(([key, value]) => ({
    [key.replace('_', '')]: value.bind(window),
  })),
);
result.value();

$(window).on('pagehide', eventClearAll);
