import assert from "node:assert/strict";
import test from "node:test";
import { PLUGIN_REGISTRY, pluginByKey, pluginStatusConflict, validatePluginRegistry } from "../lib/plugins/registry";

test("plugin registry keys and dependencies are valid", () => {
  assert.deepEqual(validatePluginRegistry(), []);
  assert.equal(new Set(PLUGIN_REGISTRY.map((plugin) => plugin.key)).size, PLUGIN_REGISTRY.length);
});

test("existing modularized features preserve current behavior", () => {
  for (const key of ["grocery-pantry", "community-events", "reports-coaching", "family-calendar", "notifications"] as const) {
    assert.equal(pluginByKey(key)?.defaultStatus, "active");
    assert.equal(pluginByKey(key)?.dataRetention, "preserve-on-deactivate");
  }
  assert.equal(pluginByKey("emotional-wellbeing")?.defaultStatus, "inactive");
});

test("dependency conflicts prevent unsafe status changes", () => {
  const calendar = pluginByKey("family-calendar")!;
  const sync = pluginByKey("calendar-sync")!;
  const current = PLUGIN_REGISTRY.map((plugin) => ({ ...plugin, active: plugin.defaultStatus === "active" }));
  assert.match(pluginStatusConflict(current, calendar, "inactive") ?? "", /Calendar Sync/);
  assert.equal(pluginStatusConflict(current.map((plugin) => plugin.key === sync.key ? { ...plugin, active: false } : plugin), calendar, "inactive"), null);
});
