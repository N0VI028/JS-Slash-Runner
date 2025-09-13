# 做完后覆盖到酒馆助手时需要调整以下内容

- 把 src/index.ts 中 `'<div id="tavern_helper_new">'` 改为 `'<div id="tavern_helper>'`
- 把 manifest.json 中 `酒馆助手vue` 改为 `酒馆助手`
- 把 package.json 中 `Tavern-Helper` 改为 `JS-Slash-Runner`
- 转换之前存在 `TavernHelper` 中的酒馆助手设置到 `tavern_helper` 中
- 把 `package.json` 中新的依赖添加过去
- 去除 `.gitignore` 中的 `dist`
- 删除 `.github/workflows`、`dist`
