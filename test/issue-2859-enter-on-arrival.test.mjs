import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");

test("#2859: enter_on_arrival does not re-stop the walk that already arrived", () => {
  const start = source.indexOf("if (enterOnArrival) {");
  assert.notEqual(start, -1, "walkViaOffice still has the enter_on_arrival branch");

  const end = source.indexOf("\n  return {", start);
  assert.notEqual(end, -1, "the enter_on_arrival branch is bounded before the walk reply");

  const block = source.slice(start, end);
  const spread = block.indexOf("...crossingDeps(),");
  const walking = block.indexOf("walking: null,");
  const stop = block.indexOf("stop: null,");
  const now = block.indexOf("now: () => arrivedAtCrossing,");

  assert.notEqual(spread, -1, "arrival entry still starts from the ordinary crossing dependencies");
  assert.ok(walking > spread, "arrival entry explicitly disables the manual-entry walking hook after spreading crossingDeps");
  assert.ok(stop > walking, "arrival entry explicitly disables the manual-entry stop hook too");
  assert.ok(now > stop, "the arrival-time override remains after the stop hooks are disabled");
});
