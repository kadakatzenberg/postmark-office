// place-words-things-are-not-ground.test.mjs — THE OFFICE'S PLACE STRING NAMES
// GROUND, NEVER A THING (Linear POS-92, the office half, 2026-09-15).
//
//   WORLD_CLONE=<a world clone> node --test test/place-words-things-are-not-ground.test.mjs
//
// THE INSTANCE, from /api/world/present on 2026-09-15: Sollerino's walk ended
// at (1088, -794.5), the shared centre of Rei's parcel, her house and the 0.2 m
// pocket lantern that sits there. `placeWordsFrom` took the innermost mark of
// the engine's containment chain, and the innermost mark was the lantern —
// "the Pocket Lantern For Hal, the Lanternseed Gardens". A body is not AT a
// lantern; it is in a room that holds one. The viewer has excluded class:thing
// from "where am I" since 2026-08-22 (spectator/viewer.mjs §
// smallestContainingMark); the office answered the same question with a
// second rule, which is the disease POS-92 names.
//
// THE LAW QUOTED: "You stand IN rooms and ON things: an object never answers
// 'where am I', however small or large. (Deliberately class-keyed, not
// size-keyed — a tiny sited mark like a bench is still ground; a giant
// sculpture is still a thing.)" — viewer.mjs, 2026-08-22.
//
// CAN FAIL: drop the `class !== "thing"` filter from placeWordsFrom → the first
// and third cases red with the lantern's and the spoon's names.
//
// Geometry is WORLD/world-state.json at world main 88a3fb0a; the engine's own
// containmentChain is imported from the clone, not stubbed, so the chain the
// office serves is the chain under test.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { WORLD_CLONE } from "../src/world-store.mjs";
import { placeWordsFrom } from "../src/world.mjs";

const enginePath = join(WORLD_CLONE ?? "", "tools", "world-verbs.mjs");
const hasEngine = !!WORLD_CLONE && existsSync(enginePath);
const verbs = hasEngine ? await import(pathToFileURL(enginePath).href) : null;

const FRAME = { id: "the-town/let-there-be-light", kind: "sited", at: { x: 0, y: 0 }, extent: { w: 320000, h: 320000 } };
const GARDENS = {
  id: "rei/the-lanternseed-gardens", kind: "sited", at: { x: 1338, y: -994.5 }, extent: { w: 1854, h: 1637 },
  points: [[2265, -1001], [2025, -439], [1554, -176], [1084, -199], [691, -465], [432, -821],
           [411, -1197], [619, -1558], [1100, -1805], [1555, -1813], [2019, -1562], [2238, -1193]],
};
const PARCEL = { id: "rei/the-lanternstep-house-parcel", kind: "parcel", at: { x: 1088, y: -794.5 }, extent: { w: 25, h: 25 } };
const HOUSE = { id: "rei/the-lanternstep-house", kind: "sited", at: { x: 1088, y: -794.5 }, extent: { w: 12, h: 12 } };
const LANTERN = { id: "rei/the-pocket-lantern-for-hal", kind: "sited", class: "thing", at: { x: 1088, y: -794.5 }, extent: { w: 0.2, h: 0.2 } };
const PARLOR = { id: "wright/the-lanternstep-parlor", kind: "sited", class: "portal-ground", at: { x: 1088, y: -792 }, extent: { w: 10, h: 6 } };
// open ground far to the south-east: a spoon dropped 10 m from the point, a cairn 150 m off
const SPOON = { id: "rowan-archive/the-ceremonial-spoon", kind: "sited", class: "thing", at: { x: 5010, y: 5000 }, extent: { w: 0.5, h: 0.5 } };
const CAIRN = { id: "the-town/lone-cairn", kind: "sited", at: { x: 5150, y: 5000 }, extent: { w: 10, h: 10 } };
const MARKS = [FRAME, GARDENS, PARCEL, HOUSE, LANTERN, PARLOR, SPOON, CAIRN];

test("Sollerino at the centre of Rei's house: the parlor he stands in, never the lantern at his feet", { skip: !hasEngine && "WORLD_CLONE with tools/world-verbs.mjs required" }, () => {
  const words = placeWordsFrom(MARKS, { x: 1088, y: -794.5 }, verbs);
  assert.equal(words, "the Lanternstep Parlor, the Lanternseed Gardens");
  assert.doesNotMatch(words, /Lantern For Hal/, "the live answer on 09-15 — a 0.2 m thing named as a place");
});

test("a thing is skipped, not the chain: the house is still the ground south of the parlor's rows", { skip: !hasEngine && "WORLD_CLONE with tools/world-verbs.mjs required" }, () => {
  assert.equal(placeWordsFrom(MARKS, { x: 1090, y: -796 }, verbs), "the Lanternstep House, the Lanternseed Gardens");
});

test("open ground: the nearest GROUND is 'near', a nearer thing is not", { skip: !hasEngine && "WORLD_CLONE with tools/world-verbs.mjs required" }, () => {
  assert.equal(placeWordsFrom(MARKS, { x: 5000, y: 5000 }, verbs), "near Lone Cairn");
  // and with no ground within 200 m, a thing beside you does not make it a place
  assert.equal(placeWordsFrom([FRAME, SPOON], { x: 5000, y: 5000 }, verbs), "open ground");
});
