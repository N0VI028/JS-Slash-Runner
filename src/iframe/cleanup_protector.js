// 优先获取原生的主窗口 jQuery 对象，确保在 parent 劫持之前获取，因此必为原生实例
const parentJQuery = window.parent.$;
// 在 parent 被 Proxy 劫持之前保存原始引用，供 pagehide 清理时直接操作，避免经过 Proxy 的 set 拦截
const originalParent = window.parent;

const recordedWrites = new Map();
let iframeObserver;
let customJQuery;
let parentDocumentProxy;

// 高性能的树遍历标记辅助函数，相比 querySelectorAll('*') 更省内存且快
function markElementTree(el, id) {
  if (!el || el.nodeType !== 1) return;
  el.setAttribute('data-th-iframe-id', id);
  let child = el.firstElementChild;
  while (child) {
    markElementTree(child, id);
    child = child.nextElementSibling;
  }
}

// 判断是否是 HTML 字符串的简易函数（优化了首尾空格和简单 HTML 标签检测）
function isHtmlString(str) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>') && trimmed.length >= 3;
}

// 转换参数中的 HTML 字符串为被标记的 jQuery 实例的通用函数
function convertHtmlArguments(args, methodName) {
  const converted = [];
  for (let i = 0; i < args.length; i++) {
    let arg = args[i];
    if (isHtmlString(arg) && parentJQuery) {
      try {
        const jq = parentJQuery(arg);
        jq.each(function () {
          markElementTree(this, iframeId);
        });
        converted.push(jq);
      } catch (e) {
        converted.push(arg); // 容错，如果 parentJQuery 解析非法选择器报错，回退到原字符串参数
      }
    } else {
      converted.push(arg);
    }
  }
  return converted;
}

// 1. 实现 parentDocumentProxy 以拦截主窗口 document.createElement
try {
  if (window.parent && window.parent.document) {
    parentDocumentProxy = new Proxy(window.parent.document, {
      get(target, prop) {
        if (prop === 'createElement') {
          return function (tagName, options) {
            const el = target.createElement(tagName, options);
            if (el && el.nodeType === 1) {
              el.setAttribute('data-th-iframe-id', iframeId);
            }
            return el;
          };
        }
        if (prop === 'createElementNS') {
          return function (namespaceURI, qualifiedName, options) {
            const el = target.createElementNS(namespaceURI, qualifiedName, options);
            if (el && el.nodeType === 1) {
              el.setAttribute('data-th-iframe-id', iframeId);
            }
            return el;
          };
        }
        const val = Reflect.get(target, prop);
        if (typeof val === 'function') {
          const desc = Object.getOwnPropertyDescriptor(target, prop);
          if (desc && !desc.writable && !desc.configurable) {
            return val;
          }
          return val.bind(target);
        }
        return val;
      },
    });
  }
} catch (e) {
  console.warn('[TavernHelper] Failed to setup parent document proxy:', e);
}

// 2. 劫持 window.parent 和 window.top 并指向包装版本
let parentProxy;
try {
  parentProxy = new Proxy(window.parent, {
    get(target, prop) {
      if (['parent', 'window', 'self', 'top', 'globalThis'].includes(prop)) {
        return parentProxy;
      }
      if (prop === '$' || prop === 'jQuery') {
        return customJQuery || Reflect.get(target, prop);
      }
      if (prop === 'document') {
        return parentDocumentProxy || Reflect.get(target, prop);
      }
      const val = Reflect.get(target, prop);
      if (typeof val === 'function') {
        const desc = Object.getOwnPropertyDescriptor(target, prop);
        if (desc && !desc.writable && !desc.configurable) {
          return val;
        }
        return val.bind(target);
      }
      return val;
    },
    set(target, prop, value) {
      if (!recordedWrites.has(prop)) {
        const exists = prop in target;
        recordedWrites.set(prop, {
          exists,
          originalValue: exists ? target[prop] : undefined,
        });
      }
      return Reflect.set(target, prop, value);
    },
    deleteProperty(target, prop) {
      if (!recordedWrites.has(prop)) {
        const exists = prop in target;
        recordedWrites.set(prop, {
          exists,
          originalValue: exists ? target[prop] : undefined,
        });
      }
      return Reflect.deleteProperty(target, prop);
    },
    has(target, prop) {
      return Reflect.has(target, prop);
    },
  });

  Object.defineProperty(window, 'parent', {
    get: () => parentProxy,
    set: () => {},
    configurable: true,
    enumerable: true,
  });
} catch (e) {
  console.warn('[TavernHelper] Failed to setup window.parent proxy:', e);
}

// window.top 在部分浏览器/Electron 环境中受安全限制，无法被重定义，单独处理以免干扰上面的 parent 代理
try {
  if (parentProxy) {
    const topDescriptor = Object.getOwnPropertyDescriptor(window, 'top');
    if (!topDescriptor || topDescriptor.configurable) {
      Object.defineProperty(window, 'top', {
        get: () => parentProxy,
        set: () => {},
        configurable: true,
        enumerable: true,
      });
    }
  }
} catch (e) {
  // window.top 在此环境中无法劫持（非致命，window.parent 的代理仍然正常工作）
}

// 3. 劫持 createElement、createElementNS 以及 cloneNode (当前 iframe)
try {
  const originalCreateElement = window.document.createElement;
  window.document.createElement = function (tagName, options) {
    const el = originalCreateElement.call(this, tagName, options);
    if (el && el.nodeType === 1) {
      el.setAttribute('data-th-iframe-id', iframeId);
    }
    return el;
  };

  const originalCreateElementNS = window.document.createElementNS;
  window.document.createElementNS = function (namespaceURI, qualifiedName, options) {
    const el = originalCreateElementNS.call(this, namespaceURI, qualifiedName, options);
    if (el && el.nodeType === 1) {
      el.setAttribute('data-th-iframe-id', iframeId);
    }
    return el;
  };

  // 拦截 cloneNode，确保被复制的已追踪元素也能被继承追踪（深度克隆包含子节点）
  const originalCloneNode = Node.prototype.cloneNode;
  Node.prototype.cloneNode = function (deep) {
    const cloned = originalCloneNode.call(this, deep);
    try {
      if (this.nodeType === 1 && this.closest(`[data-th-iframe-id="${CSS.escape(iframeId)}"]`)) {
        if (deep) {
          markElementTree(cloned, iframeId);
        } else {
          cloned.setAttribute('data-th-iframe-id', iframeId);
        }
      }
    } catch (e) {}
    return cloned;
  };
} catch (e) {
  console.warn('[TavernHelper] Failed to patch document.createElement & cloneNode:', e);
}

// 4. 监听 iframe 自身 document 变化捕获 innerHTML 元素，并应用过滤避免 O(N^2) 扫描
try {
  iframeObserver = new MutationObserver(mutations => {
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      for (let j = 0; j < mutation.addedNodes.length; j++) {
        const node = mutation.addedNodes[j];
        if (node.nodeType === 1) {
          // Node.ELEMENT_NODE
          if (node.closest(`[data-th-iframe-id="${CSS.escape(iframeId)}"]`)) {
            continue; // 如果该节点或其祖先刚刚已经被打上过当前 iframe 的标记，跳过以避免级联重复扫描
          }
          markElementTree(node, iframeId);
        }
      }
    }
  });
  iframeObserver.observe(window.document, { childList: true, subtree: true });
} catch (e) {
  console.warn('[TavernHelper] Failed to init iframe MutationObserver:', e);
}

// 5. 包装 window.$ 和 window.jQuery，自定义原型链以拦截链式调用中的 DOM 插入方法
const localJQuery = window.$;
const isLocalJQueryValid = localJQuery && localJQuery !== parentJQuery;

if (parentJQuery) {
  customJQuery = function (selector, context) {
    let result;
    try {
      result = parentJQuery(selector, context);
    } catch (e) {
      throw e; // 如果是无效选择器报错，保留 jQuery 原生异常抛出行为
    }
    Object.setPrototypeOf(result, customJQuery.fn);

    // 如果 selector 是创建 HTML 元素的字符串，说明返回的是全新创建的元素，深度打标
    if (isHtmlString(selector)) {
      result.each(function () {
        markElementTree(this, iframeId);
      });
    }
    return result;
  };

  // 继承静态方法
  Object.setPrototypeOf(customJQuery, parentJQuery);

  // 创建定制原型
  customJQuery.fn = customJQuery.prototype = Object.create(parentJQuery.fn);
  customJQuery.fn.constructor = customJQuery;

  // 重写可能由 HTML 字符串插入新节点的方法
  const methodsToPatch = ['append', 'prepend', 'before', 'after', 'html'];
  methodsToPatch.forEach(method => {
    customJQuery.fn[method] = function (...args) {
      const convertedArgs = convertHtmlArguments(args, method);
      const originalMethod = parentJQuery.fn[method];
      const result = originalMethod.apply(this, convertedArgs);
      if (result && result.jquery) {
        Object.setPrototypeOf(result, customJQuery.fn);
      }
      return result;
    };
  });

  if (!isLocalJQueryValid) {
    window.$ = window.jQuery = customJQuery;
  }
}

$(window).on('pagehide', () => {
  // 清理挂载在父窗口的全局变量
  // 使用 originalParent（Proxy 劫持前保存的引用），避免 set 操作再次被 Proxy 记录到 recordedWrites
  recordedWrites.forEach((state, prop) => {
    try {
      if (state.exists) {
        originalParent[prop] = state.originalValue;
      } else {
        delete originalParent[prop];
      }
    } catch (e) {
      console.warn(`[TavernHelper] Failed to restore/delete parent property: ${String(prop)}`, e);
    }
  });

  // 清理父窗口中的残留 DOM 元素
  if (iframeId) {
    try {
      if (window.parent && window.parent.document) {
        const escapedId = CSS.escape(iframeId);
        const allTagged = [...originalParent.document.querySelectorAll(`[data-th-iframe-id="${escapedId}"]`)];

        // 只处理最顶层的标记元素（已嵌套在将被删除元素内的就跳过，避免重复卸载和误伤）
        const topLevelElements = allTagged.filter(
          el => !el.parentElement?.closest(`[data-th-iframe-id="${escapedId}"]`),
        );

        topLevelElements.forEach(el => {
          el.remove();
        });
      }
    } catch (e) {
      console.warn('[TavernHelper] Failed to cleanup iframe elements:', e);
    }
  }

  // 断开 observer
  if (iframeObserver) {
    iframeObserver.disconnect();
  }
});
