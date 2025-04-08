function createPreload(item) {
  return $('<div>')
    .attr('id', `script_preload-${item.title}`)
    .append(item.assets.map(asset => $('<link>').attr('rel', 'preload').attr('href', asset).attr('as', 'image')));
}
$(async () => {
  const results = [];
  const variables = await getCharacterScriptVariables();

  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      const match = key.match(/^预载-(.+?)$/);
      if (!match) continue;
      const assets = value
        .split('\n')
        .map(e => e.trim())
        .filter(e => !!e);
      if (assets.length === 0) continue;

      results.push({
        title: match[1],
        assets,
      });
    }
  }

  const preloadElements = results.map(createPreload);

  !(function (elements) {
    const headElement = $('head');
    headElement.find('#script_preload').remove();
    headElement.append($('<div>').attr('id', 'script_preload').append(preloadElements));
  })(preloadElements);
});
