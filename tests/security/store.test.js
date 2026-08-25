// tests/security/store.test.js — 统一页面运行时:store 状态管理测试
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { clearProjectModules, requireProject, resetSecurityEnv } = require("./helpers");

const createMemoryStorage = () => {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
    dump: () => Object.fromEntries(data),
  };
};

beforeEach(() => {
  resetSecurityEnv();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("store: get/set/subscribe basics", () => {
  const { createStore } = requireProject("assets/store.js");
  const store = createStore({ state: { count: 0 } });
  const seen = [];
  const unsubscribe = store.subscribe((state) => seen.push(state.count));
  store.set({ count: 1 });
  store.set({ count: 2 });
  assert.deepEqual(seen, [1, 2]);
  assert.equal(store.get().count, 2);
  unsubscribe();
  store.set({ count: 3 });
  assert.deepEqual(seen, [1, 2], "unsubscribed listener must not fire");
});

test("store: set merges shallowly and reset restores initial state", () => {
  const { createStore } = requireProject("assets/store.js");
  const store = createStore({ state: { a: 1, b: 2 } });
  store.set({ b: 3, c: 4 });
  assert.deepEqual(store.get(), { a: 1, b: 3, c: 4 });
  store.reset();
  // reset 重建初始状态:多余字段 c 被清除
  assert.deepEqual(store.get(), { a: 1, b: 2 });
});

test("store: persistence round-trips through storage", () => {
  const { createStore } = requireProject("assets/store.js");
  const storage = createMemoryStorage();
  const first = createStore({ state: { count: 0 }, storage, storageKey: "k1", storageVersion: 1 });
  first.set({ count: 7 });
  const second = createStore({ state: { count: 0 }, storage, storageKey: "k1", storageVersion: 1 });
  assert.equal(second.get().count, 7, "restored from storage");
  assert.ok(storage.dump().k1.includes('"version":1'), "storage payload carries version");
});

test("store: version mismatch discards stale persisted state", () => {
  const { createStore } = requireProject("assets/store.js");
  const storage = createMemoryStorage();
  storage.setItem("k2", JSON.stringify({ version: 1, state: { schema: "old" } }));
  const store = createStore({ state: { schema: "current" }, storage, storageKey: "k2", storageVersion: 2 });
  assert.equal(store.get().schema, "current", "stale version must be ignored");
});

test("store: corrupt payload falls back to initial state", () => {
  const { createStore } = requireProject("assets/store.js");
  const storage = createMemoryStorage();
  storage.setItem("k3", "{not-json");
  const store = createStore({ state: { count: 0 }, storage, storageKey: "k3", storageVersion: 1 });
  assert.equal(store.get().count, 0);
  store.set({ count: 1 });
  assert.equal(store.get().count, 1, "store still writable after corrupt load");
});

test("store: a throwing subscriber does not break other subscribers", () => {
  const { createStore } = requireProject("assets/store.js");
  const store = createStore({ state: { n: 0 } });
  const good = [];
  store.subscribe(() => { throw new Error("boom"); });
  store.subscribe((state) => good.push(state.n));
  store.set({ n: 5 });
  assert.deepEqual(good, [5]);
});

test("store: storage write failure is tolerated (private mode)", () => {
  const { createStore } = requireProject("assets/store.js");
  const brokenStorage = {
    getItem() { return null; },
    setItem() { throw new Error("quota exceeded"); },
  };
  const store = createStore({ state: { n: 0 }, storage: brokenStorage, storageKey: "k4", storageVersion: 1 });
  store.set({ n: 1 });
  assert.equal(store.get().n, 1, "in-memory state survives storage failure");
});
