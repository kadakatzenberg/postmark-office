// amend-puts-forward.test.mjs — an amendment with escrow behind it publishes.
//
// THE DEFECT (postmark#2614, second half; hotfix w38.3, 2026-09-13). The door
// answered one amendment with two contradictory facts:
//
//     amended: true, put_forward: false,
//     "this stands as your own private draft",
//     "✦1 already stand in escrow behind it — the amendment publishes at the
//      next crossing."
//
// Both halves were honest reads of different questions. `put_forward` came from
// THIS ACT's `stamps:` (absent, so false → the claim was filed `draft`); the
// sentence came from THE MARK's escrow (✦1, so a promise). The claim sat where
// no crossing looks and the resident waited on the sentence.
//
// MEASURED, not inferred, on a scratch restored from the 2026-09-13T04:12Z
// nightly dump (prod untouched, read-only): `current-the-reader/the-keepers-flat`
// held exactly one claims row — `status draft`, `stake 0`, `window_id 185`,
// submitted 2026-09-12T07:50:18Z, still carrying `_deferred_act`. Nine more of
// the same author's amendments sat identically, the oldest since 2026-09-06.
// No promoted claim was skipped by the clearing: nothing was ever promoted.
//
// THE REPAIR, and what these tests hold. The verdict is computed ONCE
// (`putForwardVerdict`) and the sentence is derived FROM it
// (`amendmentPublishNote`), so a reply promising publication is not
// representable for a claim filed as a draft. The tests below assert that
// RELATION rather than any wording — the sentences may be rewritten freely;
// what may not change is that one exists only when the mark went forward.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { putForwardVerdict, amendmentPublishNote } from "../src/world.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = (f) => readFileSync(join(HERE, "..", "src", f), "utf8");

// The two grounds, as `groundMinimumStake` answers them: your own household's
// parcel is a zero minimum, everything else is the commons at one.
const OWN_GROUND = 0;
const COMMONS = 1;

// ── (a) THE THREE CASES THE RESIDENT MEETS ───────────────────────────────────

test("an amend with no stamps, on a mark already holding escrow ≥ the ground's minimum, is PUT FORWARD", () => {
  const v = putForwardVerdict({ staking: false, amending: true, escrowBehind: 1, groundMin: COMMONS });
  assert.equal(v.put_forward, true);
  assert.equal(v.carried_by, "standing-escrow");
  // Deva's flat exactly: ✦2 behind it after the 09-13 stake.
  assert.equal(putForwardVerdict({ amending: true, escrowBehind: 2, groundMin: COMMONS }).put_forward, true);
});

test("an amend with no stamps, on the author's OWN ground, is PUT FORWARD with nothing behind it", () => {
  const v = putForwardVerdict({ staking: false, amending: true, escrowBehind: 0, groundMin: OWN_GROUND });
  assert.equal(v.put_forward, true);
  assert.equal(v.carried_by, "standing-escrow");
});

test("an amend with no stamps, on COMMONS ground with ✦0 behind it, stays the author's DRAFT — the law is unchanged", () => {
  const v = putForwardVerdict({ staking: false, amending: true, escrowBehind: 0, groundMin: COMMONS });
  assert.equal(v.put_forward, false);
  assert.equal(v.carried_by, null);
  // and the door has nothing to promise about publication
  assert.equal(amendmentPublishNote(v), null);
});

test("a FIRST leave-mark is untouched by the widening: no stamps is still a draft, and a stake still rules on the amount", () => {
  assert.equal(putForwardVerdict({ staking: false, amending: false, groundMin: COMMONS }).put_forward, false);
  assert.equal(putForwardVerdict({ staking: false, amending: false, groundMin: OWN_GROUND }).put_forward, false);
  assert.equal(putForwardVerdict({ staking: true, stamps: 0, amending: false, groundMin: COMMONS }).put_forward, false);
  assert.equal(putForwardVerdict({ staking: true, stamps: 1, amending: false, groundMin: COMMONS }).put_forward, true);
  assert.equal(putForwardVerdict({ staking: true, stamps: 0, amending: false, groundMin: OWN_GROUND }).put_forward, true);
  // escrow standing behind a mark is NOT a licence for a fresh mark of that slug
  assert.equal(putForwardVerdict({ staking: false, amending: false, escrowBehind: 9, groundMin: COMMONS }).put_forward, false);
});

// ── (b) THE RELATION — the defect itself, made unrepresentable ───────────────

test("THE SENTENCE AND THE STATUS CANNOT DISAGREE: a publish note exists for exactly the verdicts that went forward", () => {
  let forward = 0, held = 0;
  for (const staking of [true, false])
    for (const stamps of [0, 1, 2])
      for (const amending of [true, false])
        for (const escrowBehind of [0, 1, 2])
          for (const groundMin of [OWN_GROUND, COMMONS]) {
            const v = putForwardVerdict({ staking, stamps, amending, escrowBehind, groundMin });
            const note = amendmentPublishNote(v);
            assert.equal(note !== null, v.put_forward === true,
              `note/verdict disagree for ${JSON.stringify({ staking, stamps, amending, escrowBehind, groundMin })}`);
            v.put_forward ? forward++ : held++;
          }
  // the matrix must exercise BOTH sides, or the assertion above is vacuous
  assert.ok(forward > 0 && held > 0, `one-sided matrix: ${forward} forward / ${held} held`);
});

test("the note quotes the escrow the VERDICT was ruled on — never a second, later read", () => {
  const v = putForwardVerdict({ amending: true, escrowBehind: 3, groundMin: COMMONS });
  assert.match(amendmentPublishNote(v), /3/);
  // own ground carries no number to quote, and must not invent one
  const own = putForwardVerdict({ amending: true, escrowBehind: 0, groundMin: OWN_GROUND });
  assert.equal(/[0-9]/.test(amendmentPublishNote(own)), false);
});

test("a verdict that did not go forward yields no note, whatever escrow it saw", () => {
  for (const escrowBehind of [0, 1, 5]) {
    const v = { put_forward: false, carried_by: null, escrow_behind: escrowBehind };
    assert.equal(amendmentPublishNote(v), null);
  }
  assert.equal(amendmentPublishNote(null), null);
  assert.equal(amendmentPublishNote(undefined), null);
});

// ── (c) THE TWO LAWS THIS REPAIR RESTS ON, QUOTED FROM THEIR OWN FILES ───────
//
// The verdict is only worth computing if the door still hangs the declaration
// on it and the pen still reads the status off that. Both live in other files
// and neither is reachable from here without a store, so they are pinned by
// their own sentences: change either and this reddens rather than drifting.

test("the door still hangs the declaration's `put_forward` on this verdict", () => {
  const world = src("world.mjs");
  assert.match(world, /const putForward = verdict\.put_forward;/,
    "world.mjs no longer takes its boundary from putForwardVerdict");
  assert.match(world, /\.\.\.\(putForward \? \{ put_forward: true \} : \{\}\)/,
    "the declaration no longer carries put_forward from the door's verdict");
});

test("the pen still files a claim `pending` on exactly that word", () => {
  assert.match(src("world2-claims.mjs"),
    /const status = put_forward === true \? "pending" : "draft";/,
    "world2-claims.mjs no longer derives the claim's status from put_forward");
});

test("the verdict is stripped before the answer leaves the door", () => {
  const world = src("world.mjs");
  assert.match(world, /delete result\._verdict;/,
    "the internal verdict is no longer deleted — it would reach the resident's answer");
});
