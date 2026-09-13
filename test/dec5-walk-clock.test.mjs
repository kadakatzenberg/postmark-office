// #2690 — a scheduled enter_on_arrival must not become occupancy before arrival.
//
// The DEC-5 walk guard and the explicit enter/exit door read the same passage
// ledger. The guard therefore has to ask that ledger at the town's fractional
// crossing clock, not at Unix half-days. The original defect used
// Date.now() / 43200000 here, making a future crossing (~185) look older than
// an absolute Unix half-day count (~41k) and producing phantom occupancy.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");

test("#2690 — the DEC-5 occupancy guard uses the same town clock dependency as enter/exit", () => {
  const start = source.indexOf("DEC-5, THE WALK GUARD");
  assert.notEqual(start, -1, "the DEC-5 guard still exists");
  const guard = source.slice(start, start + 5000);

  assert.match(guard, /const deps = crossingDeps\(\);/,
    "the guard obtains the enter/exit door's dependency set");
  assert.match(guard, /const atNow = law\.thresholds\.stampAt\(deps\.now\(\)\);/,
    "occupancy is evaluated at the town's fractional crossing clock");
  assert.doesNotMatch(guard, /Date\.now\(\)\s*\/\s*43200000/,
    "Unix half-days are not the ferry clock and would make future arrivals look current");
});
