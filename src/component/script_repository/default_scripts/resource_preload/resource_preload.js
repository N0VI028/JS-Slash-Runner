function createPreload(e) {
  return $('<div>')
    .attr('id', `script_preload-${e.title}`)
    .append(e.assets.map(e => $('<link>').attr('rel', 'preload').attr('href', e).attr('as', 'image')));
}
$(async () => {
  const t = (
    await (async function () {
      const variables = await getCharacterScriptVariables();
      if (!variables) return;
      for (const [key, value] of Object.entries(variables)) {
        const match = key.match(/^预载-(.+?)$/);
        if (!match) continue;
        const assets = value.split('\n').map(e => e.trim()).filter(e => !!e);
        if (assets.length === 0) continue;
        return {
          title: match[1],
          assets,
        };
      }
    })()
  ).map(createPreload);
  !(function (e) {
    const t = $('head');
    t.find('#script_preload').remove(), t.append(e);
  })($('<div>').attr('id', 'script_preload').append(t));
});
