import assert from "node:assert/strict";
import test from "node:test";
import { createGlobalLoadingController, trackAsyncService } from "../js/components/global-loading.js";

function fixture() {
  const label = { textContent: "" };
  const overlay = { hidden: true, querySelector: () => label };
  const shell = { inert: false, attributes: new Map(), setAttribute(key, value) { this.attributes.set(key, value); }, removeAttribute(key) { this.attributes.delete(key); } };
  return { overlay, shell, root: { querySelector: () => overlay, querySelectorAll: () => [shell] } };
}

test("global loader blocks the shell until all concurrent work finishes", () => {
  const { root, overlay, shell } = fixture();
  const loading = createGlobalLoadingController(root);
  const releaseA = loading.begin("Loading A");
  const releaseB = loading.begin("Loading B");
  assert.equal(overlay.hidden, false);
  assert.equal(shell.inert, true);
  releaseA();
  assert.equal(overlay.hidden, false);
  releaseB();
  assert.equal(overlay.hidden, true);
  assert.equal(shell.inert, false);
});

test("async service wrapper tracks only promised operations", async () => {
  const calls = [];
  const tracker = async (promise, message) => { calls.push(message); return promise; };
  const service = trackAsyncService({ async load() { return 42; }, value() { return 7; } }, "Working", tracker);
  assert.equal(service.value(), 7);
  assert.equal(await service.load(), 42);
  assert.deepEqual(calls, ["Working"]);
});
