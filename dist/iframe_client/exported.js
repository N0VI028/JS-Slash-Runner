"use strict";
/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js#L76
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.SillyTavern.getContext()` 来查看当前酒馆所提供的接口
 */
const SillyTavern = window.parent.SillyTavern.getContext();
/**
 * 酒馆助手提供的额外功能, 具体内容见于 https://n0vi028.github.io/JS-Slash-Runner-Doc
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.TavernHelper` 来查看当前酒馆助手所提供的接口
 * TODO: 怎么导出 TavernHelper 的类型声明
 */
const TavernHelper = window.parent.TavernHelper;
//======================================================================================================================
/**
 * @deprecated 请使用 SillyTavern 而不是 sillyTavern()
 */
function sillyTavern() {
    return SillyTavern;
}
//# sourceMappingURL=exported.js.map