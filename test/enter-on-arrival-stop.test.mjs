// enter-on-arrival-stop.test.mjs — the arrival half must not stop a walk twice.
//
// A successful enter normally ends a live walk. `enter_on_arrival` is different:
// walkViaOffice has already derived the arrival instant and substitutes the
// arrival standpoint before it asks the ordinary entry door to fire. Passing the
// entry door's normal `walking` / `stop` deps through that composition makes the
// simulated arrival consult the real-time leg, see it as still live, and attempt
// a second stop through the occupancy guard. The entry succeeds, but its answer
// falsely reports that the walk could not be stopped.
//
// This is a wiring invariant, so pin the wire directly. The repository uses
// source-seam tests for the same class of "one owner / correct caller" contract.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/world.mjs", import.meta.url), "utf8");

function arrivalWiring() {
  const start = source.indexOf("const arrivedAtCrossing =");
  assert.notEqual(start, -1, "walkViaOffice still has one named arrival-composition seam");
  const end = source.indexOf("});", start);
  assert.notEqual(end, -1, "the arrival entry call has a finite object boundary");
  return source.slice(start, end + 3);
}

test("enter_on_arrival uses the ordinary crossing deps but cannot run the mid-walk stop pair", () => {
  const wiring = arrivalWiring();

  assert.match(wiring, /\.\.\.crossingDeps\(\)/,
    "arrival still composes the ordinary entry door rather than forking its plumbing");
  assert.match(wiring, /now:\s*\(\)\s*=>\s*arrivedAtCrossing/,
    "entry is adjudicated at the arrival instant");
  assert.match(wiring, /standpointOf:\s*async\s*\(\)\s*=>\s*\(\{\s*x:\s*toward\.x,\s*y:\s*toward\.y/,
    "entry is adjudicated from the arrival standpoint");

  assert.match(wiring, /walking:\s*null/,
    "the arrival-composed entry must not re-read the real-time leg as a live mid-walk entry");
  assert.match(wiring, /stop:\s*null/,
    "the arrival-composed entry must not attempt a second stop after the walk has already arrived");
});
