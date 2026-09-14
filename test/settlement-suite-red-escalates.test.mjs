// settlement-suite-red-escalates.test.mjs — THE WIRING, not the module.
//
//   node --test test/settlement-suite-red-escalates.test.mjs
//
// ── WHY THIS EXISTS BESIDE test/settlement-escalate.test.mjs ────────────────
//
// That file proves the escalator: given a suite-red receipt it composes the
// right issue, gates the wrong receipt, caps its own list. It proves nothing at
// all about whether `deploy/settlement-auto.sh` ever CALLS it.
//
// Measured, on the reviewer's flip of PR #55: delete the call site at the
// isolate-off exit and both `settlement-escalate` and `cli-guard` stay GREEN.
// The logic is proven and the wiring is not, which is the same shape as the
// 2026-09-14 instance itself — an escalator that existed, was correct, and was
// never reached. A future edit to the sweep script could drop either call with
// nothing anywhere going red.
//
// So this runs THE REAL SCRIPT. Not a stub of it, not a grep for the line: a
// whole crossing in a bottle, against a fixture world whose grammar suite is
// red, driven to the two suite-red exits, asserting that an escalation was
// attempted before the exit.
//
// ── THE BOTTLE, AND WHY IT IS ITS OWN ──────────────────────────────────────
//
// It is the shape of test/settlement-source-flip.test.mjs's harness, minus
// everything that file needs and this one does not: no logging `git`/`npm`/
// `node` wrappers and no command log, because the question here is not which
// commands were issued but whether one line of output appeared. What is left is
// the fixture world, the fixture town, and the env — the minimum a crossing
// needs to reach its own suite gate.
//
// ── AND IT CANNOT REACH GITHUB ─────────────────────────────────────────────
//
// The observable is the escalator's ISSUE-WANTED line, which it prints when it
// finds no credential. `SETTLEMENT_ESCALATE_CRED` is pointed at a path inside
// the scratch dir that is never created, so the no-credential path is taken on
// EVERY box. Without that pin this test would pass on a laptop and POST to the
// town repo on the box, where `/srv/postmark-office/.git-credentials` is exactly
// where the escalator expects it.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const OFFICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = join(OFFICE, "deploy", "settlement-auto.sh");
const scratch = mkdtempSync(join(tmpdir(), "postmark-suitered-"));

const has = (cmd) => { try { execFileSync("sh", ["-c", cmd], { stdio: "ignore" }); return true; } catch { return false; } };
// POSIX-shell shaped, like the harness it is drawn from. Where `sh` is not a
// real shell this SKIPS rather than passes: a silent green on a box that cannot
// run a crossing is the check-reached-for-something-easier defect.
const SH_OK = has("sh -c 'true'");

// ── THE SCRIPT'S OWN LITTER, PUT BACK ──────────────────────────────────────
//
// `settlement-auto.sh` copies the failing suite log to
// `$OFFICE_ROOT/settlement-last-suite.log` — deliberately, it is where the
// deploy docs tell an operator to look — and `$OFFICE_ROOT` has to be this
// checkout, because the script runs tools out of it by absolute path. So the
// file lands in the working tree, untracked and not ignored.
//
// It is RESTORED, not merely deleted: on a box that already holds a real one
// from a real red crossing, a test that removed it would destroy the evidence
// an operator was about to read.
const LITTER = join(OFFICE, "settlement-last-suite.log");
let litterBefore = null;
before(() => { try { litterBefore = existsSync(LITTER) ? readFileSync(LITTER) : null; } catch { litterBefore = null; } });
after(() => {
  try {
    if (litterBefore === null) rmSync(LITTER, { force: true });
    else writeFileSync(LITTER, litterBefore);
  } catch { /* nothing this test can do about it, and it must not fail the run */ }
  try { rmSync(scratch, { recursive: true, force: true }); } catch { /* litter */ }
});

/** A RED grammar suite: two `not ok` lines on stdout and a non-zero exit. */
const RED_SUITE_RUNNER = [
  "console.log('TAP version 13');",
  "console.log('not ok 12 - the-town/pledges names a mark canon does not carry');",
  "console.log('not ok 40 - a household line the register has no row for');",
  "process.exit(1);",
].join("");

const SWEEP_STUB = `
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
const at = (n, d) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : d; };
const stakes = JSON.parse(readFileSync(at("--stakes"), "utf8"));
const repo = process.cwd();
const p = join(repo, "WORLD", "swept.txt");
mkdirSync(dirname(p), { recursive: true });
writeFileSync(p, "swept; " + stakes.length + " stake row(s)\\n");
execFileSync("git", ["-C", repo, "add", "-A"]);
execFileSync("git", ["-C", repo, "commit", "-qm", "settlement: sweep 1 published"], { env: { ...process.env, GIT_AUTHOR_NAME: "sweep", GIT_AUTHOR_EMAIL: "s@x.invalid", GIT_COMMITTER_NAME: "sweep", GIT_COMMITTER_EMAIL: "s@x.invalid", GIT_AUTHOR_DATE: "2026-09-08T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-08T00:00:00Z" } });
process.stdout.write(JSON.stringify({
  published: ["alpha/one"], unpublished: [], left_drafted: [], withdrawn: [], quarantined: [], dropped: [], rebased: [],
  surveyed: { branches: 0, delta_rows: 0, escrow_backed_deltas: 0 },
}) + "\\n");
`;

const STAMP_MINT_STUB = `
import { readFileSync } from "node:fs";
import { join } from "node:path";
export function currentHouseholds(clone) {
  const pins = JSON.parse(readFileSync(join(clone, "tools", "github-ids.json"), "utf8"));
  return new Map(Object.entries(pins).map(([handle, rec]) => [handle, { key: "gh:" + rec.id }]));
}
`;

let runSeq = 0;

/**
 * ONE CROSSING, IN A BOTTLE, AGAINST A RED SUITE.
 *
 * The world carries canon and a sweep stub that really commits; the town carries
 * a stake deriver and the household resolver the crossing refuses without (the
 * registry refresh, 2026-09-09 — a fixture town with no resolver is a town no
 * crossing can cross, and every case here would refuse before reaching the
 * suite). The world's `npm test` is the red one.
 */
function crossing(label, env = {}, { redSuite = true } = {}) {
  const root = join(scratch, `${label}-${++runSeq}`);
  const seed = join(root, "seed");
  const origin = join(root, "world.git");
  const sweepClone = join(root, "sweep");
  const townSeed = join(root, "town-seed");
  const townOrigin = join(root, "town.git");
  const townClone = join(root, "town");
  const harbor = join(root, "harbor");
  mkdirSync(harbor, { recursive: true });

  const g = (repo, ...a) => execFileSync("git", ["-C", repo, ...a], {
    encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "seed", GIT_AUTHOR_EMAIL: "seed@postmark.invalid",
      GIT_COMMITTER_NAME: "seed", GIT_COMMITTER_EMAIL: "seed@postmark.invalid",
      GIT_AUTHOR_DATE: "2026-08-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-08-01T00:00:00Z",
    },
  });

  // ── the world ──────────────────────────────────────────────────────────────
  mkdirSync(join(seed, "WORLD", "marks", "alpha", "published-note"), { recursive: true });
  mkdirSync(join(seed, "tools"), { recursive: true });
  writeFileSync(join(seed, "WORLD", "marks", "alpha", "published-note", "mark.md"),
    "---\nkind: sited\nby: alpha\ndate: 2026-08-01\n---\n\nalpha published this\n");
  writeFileSync(join(seed, "tools", "settlement-sweep.mjs"), SWEEP_STUB);
  // NOTE what is NOT here: `tools/settlement-isolate.mjs`. Its absence is what
  // drives the default arm to the UNATTRIBUTABLE exit — the isolator is invoked,
  // cannot run, and exits non-zero, which is the same branch a real isolator
  // takes when it cannot attribute the red to any mark.
  writeFileSync(join(seed, "package.json"), JSON.stringify({
    name: "world-fixture",
    scripts: { test: redSuite ? `node -e ${JSON.stringify(RED_SUITE_RUNNER)}` : 'node -e ""' },
  }));
  g(".", "init", "-q", "-b", "main", seed);
  g(seed, "config", "user.email", "seed@postmark.invalid");
  g(seed, "config", "user.name", "seed");
  g(seed, "add", "-A");
  g(seed, "commit", "-qm", "canon");
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin], { stdio: "ignore" });
  g(seed, "remote", "add", "origin", origin);
  g(seed, "push", "-q", "origin", "main");
  g(seed, "branch", "draft/alpha", "main");
  g(seed, "push", "-q", "origin", "draft/alpha");
  execFileSync("git", ["clone", "-q", origin, sweepClone], { stdio: "ignore" });
  execFileSync("git", ["-C", sweepClone, "config", "user.email", "sweep@postmark.invalid"], { stdio: "ignore" });
  execFileSync("git", ["-C", sweepClone, "config", "user.name", "sweep"], { stdio: "ignore" });

  // ── the town ───────────────────────────────────────────────────────────────
  mkdirSync(join(townSeed, "tools"), { recursive: true });
  writeFileSync(join(townSeed, "tools", "world-stake.mjs"),
    'process.stdout.write(JSON.stringify([{ holder: "alpha", mark: "alpha/one", n: 1, weight: 3, tick: 0 }]) + "\\n");\n');
  writeFileSync(join(townSeed, "tools", "github-ids.json"),
    `${JSON.stringify({ alpha: { login: "alpha-hub", id: 1 } }, null, 2)}\n`);
  writeFileSync(join(townSeed, "tools", "stamp-mint.mjs"), STAMP_MINT_STUB);
  g(".", "init", "-q", "-b", "main", townSeed);
  g(townSeed, "config", "user.email", "seed@postmark.invalid");
  g(townSeed, "config", "user.name", "seed");
  g(townSeed, "add", "-A");
  g(townSeed, "commit", "-qm", "town");
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", townOrigin], { stdio: "ignore" });
  g(townSeed, "remote", "add", "origin", townOrigin);
  g(townSeed, "push", "-q", "origin", "main");
  execFileSync("git", ["clone", "-q", townOrigin, townClone], { stdio: "ignore" });

  const res = spawnSync("sh", [SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      OFFICE_ROOT: OFFICE,
      TOWN_CLONE: townClone,
      WORLD_CLONE: sweepClone,
      SETTLEMENT_CLONE: sweepClone,
      SETTLEMENT_REPORT: join(harbor, "settlement-auto.json"),
      SETTLEMENT_HISTORY: join(harbor, "settlement-auto-history.jsonl"),
      // So the retry wrapper does not re-exec the script; the retry has its own
      // falsifier (test/settlement-retry.test.mjs).
      SETTLEMENT_ATTEMPT: "1",
      WORLD_SINGLE_LOG: "1",
      WORLD_DYNAMIC_DB: join(root, "dynamic.db"),
      SWEEP_SAW_OUT: join(root, "sweep-saw.json"),
      // § AND IT CANNOT REACH GITHUB, above.
      SETTLEMENT_ESCALATE_CRED: join(root, "no-such-credential-file"),
      ...env,
    },
  });

  let receipt = null;
  try { receipt = JSON.parse(readFileSync(join(harbor, "settlement-auto.json"), "utf8")); } catch { /* none written */ }
  return { root, res, receipt, escalations: res.stderr.match(/\[settlement-escalate\][^\n]*/g) ?? [] };
}

/** The whole observable, in one place: did the call site fire, and for which class. */
const escalatedAs = (run) => run.escalations.join("\n").match(/ISSUE-WANTED title: settlement refusal: (\S+)/)?.[1] ?? null;

test("THE WIRING · the isolate-off suite-red exit ESCALATES before it exits 1", { skip: !SH_OK && "no POSIX sh" }, () => {
  // `SETTLEMENT_ISOLATE=0` takes the plain-red arm — the one the reviewer's flip
  // deleted while every other suite stayed green.
  const run = crossing("plain", { SETTLEMENT_ISOLATE: "0" });

  assert.equal(run.res.status, 1, `a red suite publishes nothing and exits 1: ${run.res.stderr.slice(-800)}`);
  assert.match(run.res.stderr, /SUITE RED/,
    "the bottle never reached the suite-red exit, so this test proves nothing about it");
  assert.equal(escalatedAs(run), "suite-red",
    "the suite-red exit reached `exit 1` with NO escalation — the 2026-09-14 instance, in which an escalator "
    + "that existed and was correct was simply never called");

  // AND THE ISSUE IT WOULD HAVE FILED IS THE RIGHT ONE. Without this the test
  // would pass on a call site that fired with the wrong arguments — the suite's
  // own reds are the whole reason a person can act on this issue at all.
  const body = run.escalations.join("\n") + run.res.stderr;
  assert.match(body, /not ok 12 - the-town\/pledges names a mark canon does not carry/);
  assert.match(body, /IT DID NOT RUN/,
    "the isolate-off exit must say the pass never ran, not that it attributed nothing");
});

test("THE WIRING · the UNATTRIBUTABLE suite-red exit escalates too, and says so differently", { skip: !SH_OK && "no POSIX sh" }, () => {
  // The default arm. The fixture world carries no `tools/settlement-isolate.mjs`,
  // so the isolator is invoked, exits non-zero, and the script takes the exit it
  // takes when a red cannot be pinned on any mark this crossing carried.
  const run = crossing("unattributed");

  assert.equal(run.res.status, 1, `a red suite publishes nothing and exits 1: ${run.res.stderr.slice(-800)}`);
  assert.match(run.res.stderr, /SUITE RED, UNATTRIBUTABLE/,
    "the bottle took the isolate-off arm instead — the two exits must be reached separately or one is untested");
  assert.equal(escalatedAs(run), "suite-red");

  const body = run.escalations.join("\n") + run.res.stderr;
  assert.match(body, /IT RAN AND ATTRIBUTED NOTHING/,
    "this exit must not borrow the isolate-off verdict: one says nobody looked, the other says nothing was found, "
    + "and a person reading the wrong one hunts a law-level red that may belong to a single mark");
  assert.doesNotMatch(body, /IT DID NOT RUN/);
});

test("THE CONTROL · a GREEN suite reaches no suite-red exit and escalates nothing", { skip: !SH_OK && "no POSIX sh" }, () => {
  // Without this, both assertions above are satisfied by a script that escalates
  // on every crossing — which would bury the queue exactly as filing a fresh
  // issue per crossing would, and would look identical from the two tests above.
  const run = crossing("green", { SETTLEMENT_ISOLATE: "0" }, { redSuite: false });

  assert.doesNotMatch(run.res.stderr, /SUITE RED/, "the green control reached a suite-red exit");
  assert.deepEqual(run.escalations, [],
    "a crossing whose suite passed escalated anyway — an alarm that always fires is an alarm nobody reads");
});
