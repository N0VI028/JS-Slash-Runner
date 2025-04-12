//@ts-nocheck

namespace detail {
  export function get_current_preset_name(): string {
    return $('#settings_preset_openai').find(':selected').text();
  }

  function get_current_global_lorebooks(): string[] {
    return $('#world_info')
      .find(':selected')
      .toArray()
      .map(node => $(node).text());
  }

  export function get_current_connection_profile(): string {
    return $('#connection_profiles').find(':checked').text();
  }

  function extract_tags_from(name: string): string[] {
    return [...name.matchAll(/【(.*?)】/g)].map(match => match[1]);
  }

  export function extract_tags(): string[] {
    return _.sortedUniq(
      _.sortBy(
        [
          ...extract_tags_from(get_current_preset_name()),
          ...get_current_global_lorebooks().flatMap(extract_tags_from),
          ...extract_tags_from(get_current_connection_profile()),
        ].map(tag => tag.toLowerCase()),
      ),
    );
  }

  export function check_should_enable(title: string, tags: string[]): boolean {
    return [...title.matchAll(/【(.*?)】/g)]
      .map(match => match[1])
      .some(tag_list =>
        tag_list
          .split('&')
          .map(tag => tag.toLowerCase())
          .every(expected => tags.includes(expected)),
      );
  }
}

async function toggle_tagged_preset_prompts(tags: string[]) {
  const prompt_anchors = $('#completion_prompt_manager')
    .find('a[title]')
    .filter(function () {
      return (
        $(this)
          .text()
          .match(/【.*?】/) !== null
      );
    })
    .toArray();

  const prompt_identifiers_to_be_toggled = prompt_anchors
    .map(prompt_anchor => {
      const anchor = $(prompt_anchor);
      const li = anchor.closest('li');

      const identifier = li.attr('data-pm-identifier') as string;

      const should_enable = detail.check_should_enable(anchor.attr('title') as string, tags);
      const is_enabled = li.find('.prompt-manager-toggle-action').hasClass('fa-toggle-on');
      return { identifier, should_toggle: should_enable !== is_enabled };
    })
    .filter(({ should_toggle }) => should_toggle)
    .map(({ identifier }) => `identifier=${identifier}`);
  if (prompt_identifiers_to_be_toggled.length !== 0) {
    await triggerSlash(`/setpromptentry ${prompt_identifiers_to_be_toggled.join(' ')}`);
  }
}

async function toggle_tagged_regexes(tags: string[]) {
  const regexes = await getTavernRegexes({ scope: 'all' });

  let new_regexes = _.cloneDeep(regexes);
  new_regexes
    .filter(regex => regex.script_name.match(/【.*?】/) !== null)
    .forEach(regex => {
      regex.enabled = detail.check_should_enable(regex.script_name, tags);
    });

  if (_.isEqual(regexes, new_regexes)) {
    return;
  }
  await replaceTavernRegexes(new_regexes, { scope: 'all' });
}

let tags: string[] = [];
let preset_name: string = '';
let connection_profile: string = '';
async function toggle_tags(): Promise<void> {
  const new_tags = detail.extract_tags();
  const new_preset_name = detail.get_current_preset_name();
  const new_connection_profile = detail.get_current_connection_profile();
  if (
    _.isEqual(tags, new_tags) &&
    _.isEqual(preset_name, new_preset_name) &&
    _.isEqual(connection_profile, new_connection_profile)
  ) {
    return;
  }
  tags = new_tags;
  preset_name = new_preset_name;
  connection_profile = new_connection_profile;

  await toggle_tagged_preset_prompts(tags);
  await toggle_tagged_regexes(tags);
}

$(() => {
  toggle_tags();
  eventOn(tavern_events.SETTINGS_UPDATED, toggle_tags);
});
