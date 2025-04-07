async function e(e, n = {}) {
  const t = n.scope ?? 'disable',
    a =
      (n.button,
      (function (e) {
        try {
          return new URL(e);
        } catch (e) {
          return;
        }
      })(e));
  a && (e = await fetch(a).then(e => e.text()));
  const r = (function (e) {
    try {
      return JSON.parse(e);
    } catch (e) {
      return;
    }
  })(e);
  if (!r)
    return void console.warn(
      '[自动导入快速回复] 未能成功导入快速回复, 请确认所给的内容是一个正确的快速回复文件内容, 或是快速回复文件的链接网址',
    );
  const c = r.qrList;
  triggerSlash(
    `\n    /parser-flag STRICT_ESCAPING on ||\n    /qr-set-off "${r.name}" ||\n    /qr-chat-set-off "${
      r.name
    }" ||\n    /qr-set-delete ${r.name} ||\n    /qr-set-create nosend=${r.disableSend} before=${
      r.placeBeforeInput
    } inject=${r.injectInput} ${r.name} ||\n    ${c
      .map(
        e =>
          `/qr-create set=${r.name} label=${e.label} ${e.icon ? `icon=${e.icon}` : ''} showlabel=${
            e.showLabel
          } hidden=${e.isHidden} startup=${e.executeOnStartup} user=${e.executeOnUser} bot=${e.executeOnAi} load=${
            e.executeOnChatChange
          } new=${e.executeOnNewChat} group=${e.executeOnGroupMemberDraft} title=${e.title} "${e.message
            .replaceAll('"', '\\"')
            .replaceAll('<user>', '{{user}}')
            .replaceAll('<char>', '{{char}}')
            .replaceAll('{{', '\\{\\{')}" ||\n`,
      )
      .join('')}\n    ${c
      .filter(e => e.contextList.length !== 0)
      .map(e =>
        e.contextList
          .map(n => `/qr-contextadd set=${r.name} label=${e.label} id=${e.id} chain=${n.isChained} "${n.set}" ||\n`)
          .join(''),
      )}\n    ${
      {
        disable: '',
        character: `/qr-chat-set-on visible=${n.button} "${r.name}" ||\n`,
        global: `/qr-set-on visible=${n.button} "${r.name}" ||\n`,
      }[t]
    }\n    /parser-flag STRICT_ESCAPING off ||\n`,
  );
}
$(),
  (async function () {
    $('#qr--isEnabled').prop('checked', !0)[0].dispatchEvent(new Event('click'));
    const variables = await getCharacterScriptVariables();
    if (!variables) return;
    for (const [key, value] of Object.entries(variables)) {
      const t = key.match(/^快速回复-(不启用|聊天|全局)-(显示按钮|不显示按钮)-.*$/);
      if (!t) continue;
      const a = {
        scope: { 不启用: 'disable', 聊天: 'character', 全局: 'global' }[t[1]],
        button: { 显示按钮: !0, 不显示按钮: !1 }[t[2]],
      };
      console.info(`[自动导入快速回复] 从 ${key} 中导入快速回复, 选项: ${JSON.stringify(a)}`);
      e(value, a);
    }
  })();
