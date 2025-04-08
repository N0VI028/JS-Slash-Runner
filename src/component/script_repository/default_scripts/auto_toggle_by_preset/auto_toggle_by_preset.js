!(function (detail) {
  function get_current_preset_name() {
    return $('#settings_preset_openai').find(':selected').text();
  }
  function get_current_connection_profile() {
    return $('#connection_profiles').find(':checked').text();
  }
  function extract_tags_from(name) {
    return [...name.matchAll(/【(.*?)】/g)].map(match => match[1]);
  }
  (detail.get_current_preset_name = get_current_preset_name),
    (detail.get_current_connection_profile = get_current_connection_profile),
    (detail.extract_tags = function extract_tags() {
      return _.sortedUniq(
        _.sortBy([
          ...extract_tags_from(get_current_preset_name()),
          ...$('#world_info')
            .find(':selected')
            .toArray()
            .map(node => $(node).text())
            .flatMap(extract_tags_from),
          ...extract_tags_from(get_current_connection_profile()),
        ]),
      );
    }),
    (detail.check_should_enable = function check_should_enable(title, tags) {
      return [...title.matchAll(/【(.*?)】/g)]
        .map(match => match[1])
        .some(tag_list => tag_list.split('&').every(expected => tags.includes(expected)));
    });
})(detail || (detail = {}));
let tags = [],
  preset_name = '',
  connection_profile = '';
async function toggle_tags() {
  const new_tags = detail.extract_tags(),
    new_preset_name = detail.get_current_preset_name(),
    new_connection_profile = detail.get_current_connection_profile();
  (_.isEqual(tags, new_tags) &&
    _.isEqual(preset_name, new_preset_name) &&
    _.isEqual(connection_profile, new_connection_profile)) ||
    ((tags = new_tags),
    (preset_name = new_preset_name),
    (connection_profile = new_connection_profile),
    await (async function toggle_tagged_preset_prompts(tags) {
      const prompt_anchors = $('#completion_prompt_manager')
        .find('a[title]')
        .filter(function () {
          return (
            null !==
            $(this)
              .text()
              .match(/【.*?】/)
          );
        })
        .toArray();
      await Promise.all(
        prompt_anchors.map(prompt_anchor => {
          const anchor = $(prompt_anchor),
            title = anchor.attr('title'),
            checkbox = anchor.closest('li').find('.prompt-manager-toggle-action');
          detail.check_should_enable(title, tags) !== checkbox.hasClass('fa-toggle-on') && checkbox[0].click();
        }),
      );
    })(tags),
    await (async function toggle_tagged_regexes(tags) {
      const regexes = await getTavernRegexes({ scope: 'all' });
      const new_regexes = _.cloneDeep(regexes);
      await Promise.all(
        new_regexes
          .filter(regex => null !== regex.script_name.match(/【.*?】/))
          .map(async regex => {
            regex.enabled = detail.check_should_enable(regex.script_name, tags);
          }),
      ),
        _.isEqual(regexes, new_regexes) || (await replaceTavernRegexes(new_regexes, { scope: 'all' }));
    })(tags));
}
toggle_tags(), eventOn(tavern_events.SETTINGS_UPDATED, toggle_tags);
