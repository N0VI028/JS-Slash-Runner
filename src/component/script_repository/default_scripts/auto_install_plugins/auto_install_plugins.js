$(async () => {
  const extensions = await getCharacterScriptVariables();
  if (!extensions) return;
  for (const [key, value] of Object.entries(extensions)) {
    const t = key.match(/预安装插件-(.*)/);
    if (!t) continue;
    const urls = YAML.parse(value);
    for (const [name, url] of Object.entries(urls)) {
      let tag = url.replace(/(\.git|\/)$/, '');
      tag = tag.substring(tag.lastIndexOf('/') + 1);
      return {
        [tag]: {
          name,
          url,
        },
      };
    }
  }
  const current_extensions = await detail.get_third_party_extension_names();
  const uninstall_extension_tags = _.difference(Object.keys(extensions), current_extensions);
  if (uninstall_extension_tags.length === 0) {
    return;
  }
  if (
    !(await notify.confirm(
      '以下需要的插件尚未安装, 是否安装?<br>' +
        uninstall_extension_tags.map(tag => `- ${extensions[tag].name}`).join('<br>'),
      { leftAlign: true },
    ))
  ) {
    return;
  }
  await Promise.allSettled(uninstall_extension_tags.map(tag => detail.install_extension(extensions[tag].url)));
  setTimeout(() => triggerSlash('/reload-page'), 3000);
});
var notify;
(function (notify) {
  async function echo(severity, text) {
    await triggerSlash(`/echo severity=${severity} "${text}"`);
  }
  notify.echo = echo;
  async function confirm(text, options = {}) {
    return await sillyTavern().callGenericPopup(text, sillyTavern().POPUP_TYPE.CONFIRM, '', options);
  }
  notify.confirm = confirm;
})(notify || (notify = {}));

(function (detail) {
  async function get_third_party_extension_names() {
    try {
      const response = await fetch('/api/extensions/discover');
      if (response.ok) {
        const extensions = await response.json();
        return extensions
          .filter(extension => extension.type !== 'system')
          .map(extension => extension.name.replace('third-party/', ''));
      } else {
        return [];
      }
    } catch (err) {
      console.error(err);
      return [];
    }
  }
  detail.get_third_party_extension_names = get_third_party_extension_names;
  async function install_extension(url) {
    const request = await fetch('/api/extensions/install', {
      method: 'POST',
      headers: sillyTavern().getRequestHeaders(),
      body: JSON.stringify({
        url,
      }),
    });
    if (!request.ok) {
      const text = await request.text();
      notify.echo('warning', `扩展安装失败: ${text || request.statusText}`);
      console.error('扩展安装失败', request.status, request.statusText, text);
      return false;
    }
    const response = await request.json();
    notify.echo(
      'success',
      `扩展安装成功: 已成功安装由 '${response.author}' 编写的 '${response.display_name}' (版本 ${response.version})!`,
    );
    console.debug(`已成功将 '${response.display_name}' 安装到 ${response.extensionPath}`);
    return true;
  }
  detail.install_extension = install_extension;
  async function check_and_confirm_install_extension(extension_name, url) {
    const extension_names = await get_third_party_extension_names();
    if (extension_names.includes(extension_name)) {
      return false;
    }
    const confirmed = await notify.confirm(`检测到酒馆没有安装 ${extension_name} 扩展, 是否安装?`);
    if (!confirmed) {
      return false;
    }
    return await install_extension(url);
  }
  detail.check_and_confirm_install_extension = check_and_confirm_install_extension;
})(detail || (detail = {}));
