# 样例说明

不再区分 iframe_client 和 iframe_server，而是直接实现一个函数，然后注册到 index.ts 里. 此后就能用 `window.TavernHelper.xxx` 来调用它 (iframe 里用 `iframe_client/exported.ts` 里包装的 `TavernHelper.xxx`).

这个函数:

- 声明就是按 `iframe_client` 那样编写者该怎么用就怎么声明.
- 实现就是按 `iframe_server` 那样具体地实现.
- `client` 和 `server` 之间的 `postMessage` 没有了, 对应的性能损失等也没了, **而且这意味着函数不一定是 async**. 比如 `getVariables` 就不是, 这个需要注意改一下原来的函数.
- 实现完成后, 直接删掉 `iframe_server` 中的对应内容, 将 `iframe_client` 里的函数实现换为 `TavernHelper` 版本.

日志 `console.info` 等不知道该怎么记录代码是在哪个 iframe 里运行的了, 不过应该影响不大.
