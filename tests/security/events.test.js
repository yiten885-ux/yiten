// tests/security/events.test.js — 事件工具(delegate/on/bindAll)测试
const assert = require("node:assert/strict");
const { afterEach, beforeEach, test } = require("node:test");
const { clearProjectModules, requireProject, resetSecurityEnv } = require("./helpers");

// 最小 DOM mock:支持 addEventListener/closest/contains
const makeElement = () => {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    closest(selector) {
      return this.matches ? (this.matches(selector) ? this : null) : null;
    },
    contains() {
      return true;
    },
    dispatch(type, event) {
      const fn = listeners.get(type);
      if (fn) fn(event || { target: this });
    },
  };
};

beforeEach(() => {
  resetSecurityEnv();
  clearProjectModules();
});
afterEach(resetSecurityEnv);

test("events: delegate fires only for matching descendants", () => {
  const e = requireProject("assets/events.js");
  const root = makeElement();
  const button = makeElement();
  button.matches = (selector) => selector === ".filter";
  const other = makeElement();
  other.matches = () => false;

  let calls = 0;
  const disposer = e.delegate(root, ".filter", "click", (_event, target) => {
    calls += 1;
    assert.equal(target, button);
  });

  root.dispatch("click", { target: button });
  root.dispatch("click", { target: other });
  assert.equal(calls, 1, "only matching element handled");

  disposer();
  root.dispatch("click", { target: button });
  assert.equal(calls, 1, "disposer removes listener");
});

test("events: on binds and disposer removes", () => {
  const e = requireProject("assets/events.js");
  const target = makeElement();
  let calls = 0;
  const disposer = e.on(target, "submit", () => { calls += 1; });
  target.dispatch("submit");
  assert.equal(calls, 1);
  disposer();
  target.dispatch("submit");
  assert.equal(calls, 1);
});

test("events: bindAll registers delegate + on and disposes all", () => {
  const e = requireProject("assets/events.js");
  const root = makeElement();
  const target = makeElement();
  const button = makeElement();
  button.matches = () => true;
  let delegated = 0;
  let direct = 0;
  const disposeAll = e.bindAll([
    { delegate: [root, "[data-action]", "click", () => { delegated += 1; }] },
    { on: [target, "submit", () => { direct += 1; }] },
  ]);
  root.dispatch("click", { target: button });
  target.dispatch("submit");
  assert.equal(delegated, 1);
  assert.equal(direct, 1);
  disposeAll();
  root.dispatch("click", { target: button });
  target.dispatch("submit");
  assert.equal(delegated, 1);
  assert.equal(direct, 1);
});
