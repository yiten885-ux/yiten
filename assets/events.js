// assets/events.js — 事件工具(零依赖,UMD)
// delegate:事件委托(root 级监听,按 selector 分发)——动态渲染的元素自动生效,无需重绑。
// on / bindAll:统一注册 + 返回 disposer,便于集中管理与清理。
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YitenEvents = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // delegate(root, selector, type, handler, options) → disposer
  // handler(event, matchedElement)
  const delegate = (root, selector, type, handler, options) => {
    const listener = (event) => {
      const target = event.target && typeof event.target.closest === "function"
        ? event.target.closest(selector)
        : null;
      if (!target) return;
      if (typeof root.contains === "function" && !root.contains(target)) return;
      handler(event, target);
    };
    root.addEventListener(type, listener, options);
    return () => root.removeEventListener(type, listener, options);
  };

  // on(target, type, handler, options) → disposer
  const on = (target, type, handler, options) => {
    target.addEventListener(type, handler, options);
    return () => target.removeEventListener(type, handler, options);
  };

  // bindAll([{ delegate: [root, selector, type, handler], }, { on: [target, type, handler] }, ...]) → disposeAll
  const bindAll = (bindings) => {
    const disposers = [];
    for (const binding of bindings || []) {
      if (Array.isArray(binding.delegate)) {
        disposers.push(delegate(...binding.delegate));
      } else if (Array.isArray(binding.on)) {
        disposers.push(on(...binding.on));
      }
    }
    return () => disposers.forEach((disposer) => disposer());
  };

  return { bindAll, delegate, on };
});
