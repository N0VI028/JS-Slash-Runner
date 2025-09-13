let result = _(window as Record<string, any>);
result = result.set('SillyTavern', (_.get(window.parent, 'SillyTavern') as any).getContext());
result = result.set('TavernHelper', _.get(window.parent, 'TavernHelper'));
result = result.set('toastr', _.get(window.parent, 'toastr'));
result = result.set('log', _.get(window.parent, 'log'));
result = result.set('YAML', _.get(window.parent, 'YAML'));
result = result.set('z', _.get(window.parent, 'z'));
result = result.set('EjsTemplate', _.get(window.parent, 'EjsTemplate'));
result = result.set('Mvu', _.get(window.parent, 'Mvu'));
result = result.merge(result.get('TavernHelper'));
result = result.merge(
  ...Object.entries(result.get('TavernHelper')._bind as Record<string, Function>).map(([key, value]) => ({
    [key.replace('_', '')]: value.bind(window),
  })),
);
result.value();

declare function eventClearAll(): void;
$(window).on('pagehide', eventClearAll);
