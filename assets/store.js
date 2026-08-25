// assets/store.js — 轻量状态管理(零依赖,UMD)
// 前端: <script src="./assets/store.js" defer></script> → window.YitenStore
// 后端/测试: require("./store.js") → module.exports
// 统一页面运行时的一部分:共享状态 + 订阅通知 + 可选 localStorage 持久化。
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.YitenStore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // createStore({ state, storage, storageKey, storageVersion })
  //  - state: 初始状态(浅拷贝)
  //  - storage: 实现 getItem/setItem 的对象(localStorage);缺省不持久化
  //  - storageKey: 持久化键;storageVersion: 版本号(结构变更时 +1 使旧数据失效)
  // 返回 { get, set, subscribe, reset }
  const createStore = ({ state: initialState = {}, storage = null, storageKey = "", storageVersion = 1 } = {}) => {
    let state = { ...initialState };
    const subscribers = new Set();

    if (storage && storageKey) {
      try {
        const raw = storage.getItem(storageKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.version === storageVersion && saved.state && typeof saved.state === "object") {
            state = { ...state, ...saved.state };
          }
        }
      } catch (_error) {
        // 损坏数据:保留初始状态
      }
    }

    const get = () => state;

    const set = (patch) => {
      state = { ...state, ...patch };
      if (storage && storageKey) {
        try {
          storage.setItem(storageKey, JSON.stringify({ version: storageVersion, state }));
        } catch (_error) {
          // 配额/隐私模式:跳过持久化,内存态仍有效
        }
      }
      subscribers.forEach((fn) => {
        try {
          fn(state);
        } catch (_error) {
          // 单个订阅者异常不影响其他
        }
      });
      return state;
    };

    const subscribe = (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    };

    const reset = () => {
      state = { ...initialState };
      if (storage && storageKey) {
        try {
          storage.setItem(storageKey, JSON.stringify({ version: storageVersion, state }));
        } catch (_error) {
          // 同 set:持久化失败不影响内存态
        }
      }
      subscribers.forEach((fn) => {
        try {
          fn(state);
        } catch (_error) {
          // 单个订阅者异常不影响其他
        }
      });
      return state;
    };

    return { get, set, subscribe, reset };
  };

  return { createStore };
});
