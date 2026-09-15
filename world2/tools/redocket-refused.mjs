#!/usr/bin/env node
// redocket-refused.mjs — THE OPERATOR DOOR FOR AN ACT THE OFFICE MIS-DOCKETED.
//
//   WORLD2_PG_URL=<the office's own pen>  node world2/tools/redocket-refused.mjs \
//       --acts 6063-6074 [--office /srv/postmark-office] [--write --reason "<why>"]
//
//   Dry-run by default: prints, per act, the docket row it would write and the
//   standing mark that row would supersede, and touches nothing. `--write` needs
//   a `--reason`, which rides in the new row's `data._redocket` beside the id of
//   the refused row it replaces (the settlement sweep strips `_`-keys before
//   canon — settlement-sweep.mjs § the frontmatter filter — so nothing of this
//   reaches a mark file).
//
// EXIT CODES: 0 written, or a dry run printed · 1 REFUSED, naming the act ·
//             2 a bad argument or a missing credential.
//
// ── THE INSTANCE (2026-09-15, Keemin: "let's re-amend the twelve for Current") ──
//
// Current the Reader amended twelve of his marks at 17:01–17:02Z on 2026-09-14
// (acts 6063–6074). The drain docketed them with `supersedes` NULL — the defect
// postmark#2806 names — and the 17:45Z clearing at window 189 refused all twelve
// as "duplicate: a standing mark already carries this slug". The fix shipped as
// release/2026-w38.3 four hours later; the acts stayed refused. The acts are
// his; the refusal was ours.
//
// ── WHY THIS IS A REPLAY AND NOT AN ACT IN HIS NAME ─────────────────────────
//
// The office cannot declare for a resident: an act is signed by its author's
// key, and someone else's resident acting is impersonation (human-actor.mjs).
// This tool writes NO act. It hands the resident's OWN act — already on the
// record, already his — to the docket pen a second time, exactly as the drain
// would have the first time had it not been broken: `claimTxFromJournal`, the
// one function that turns an act into a claim, inside `withHousehold`, the one
// transaction shape 007 allows. `supersedes` is computed by that function from
// the standing mark, which is the whole of #2806's fix. The new row carries the
// act's id (`_act_id`) like every docket row, so the closure falsifier can see
// that one act now has two rows — one refused, one live — and judges that by
// name (falsifier-acts-claims-closure.mjs § one act, two rows).
//
// ── WHAT IT REFUSES ─────────────────────────────────────────────────────────
//
//   · an act that is not a mark act (class 'mark', leave-mark | amend)
//   · an act with no docket row at all — a MISSING row is the closure
//     falsifier's class and a different repair from a refused one
//   · an act with a LIVE row already (pending or locked): it is on the docket
//   · no open window: the candle is dark
//
// The whole set is judged before anything is written, and a dry run prints the
// same verdicts, so a partial set is never a surprise.

import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i === -1 ? null : argv[i + 1]; };
const WRITE = argv.includes("--write");
const REASON = arg("--reason");
const OFFICE = resolve(arg("--office") ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));

const ids = [];
for (const part of String(arg("--acts") ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
  const m = part.match(/^(\d+)(?:-(\d+))?$/);
  if (!m) { console.error(`bad --acts entry: ${part}`); process.exit(2); }
  const lo = Number(m[1]), hi = Number(m[2] ?? m[1]);
  for (let i = lo; i <= hi; i++) ids.push(i);
}
if (!ids.length) { console.error("usage: --acts <id[,id|lo-hi…]> [--office <tree>] [--write --reason <why>]"); process.exit(2); }
if (WRITE && !REASON) { console.error("--write needs --reason"); process.exit(2); }
if (!process.env.WORLD2_PG_URL) { console.error("WORLD2_PG_URL missing"); process.exit(2); }
for (const f of ["node_modules/pg/package.json", "src/world2-claims.mjs"]) {
  if (!existsSync(join(OFFICE, f))) { console.error(`no ${f} under --office ${OFFICE}`); process.exit(2); }
}

const require = createRequire(join(OFFICE, "package.json"));
const pg = require("pg");
const { withHousehold, householdKeyFor, claimTxFromJournal } =
  await import(pathToFileURL(join(OFFICE, "src", "world2-claims.mjs")).href);

const pool = new pg.Pool({ connectionString: process.env.WORLD2_PG_URL, max: 1 });
const q = (sql, args) => pool.query(sql, args);

const { rows: [win] } = await q("SELECT id, closes_at FROM windows WHERE status = 'open' ORDER BY id DESC LIMIT 1");
if (!win) { console.error("REFUSED: no open window — the candle is dark"); await pool.end(); process.exit(1); }
console.log(`${WRITE ? "WRITE" : "DRY-RUN"} · open window ${win.id} (closes ${win.closes_at?.toISOString?.() ?? win.closes_at}) · ${ids.length} act(s)`);

// ── judge the whole set first ───────────────────────────────────────────────
const plan = [];
let refused = 0;
for (const id of ids) {
  const { rows: [act] } = await q("SELECT id, actor, action, object, class, payload, at FROM acts WHERE id = $1", [id]);
  const head = `  act ${id}${act ? ` ${act.actor} ${act.action} ${act.object ?? ""}` : ""}`;
  const refuse = (why) => { console.log(`${head} → REFUSED — ${why}`); refused++; };
  if (!act) { refuse("no such act"); continue; }
  if (act.class !== "mark" || !["leave-mark", "amend"].includes(act.action)) { refuse(`not a mark act (class ${act.class}, action ${act.action})`); continue; }
  const { rows: docket } = await q(
    "SELECT id, status, window_id, refusal_check FROM claims WHERE data->>'_act_id' = $1 ORDER BY submitted_at", [String(id)]);
  if (!docket.length) { refuse("no docket row carries this act — a MISSING row, not a refused one (falsifier-acts-claims-closure's class)"); continue; }
  const live = docket.find((c) => c.status === "pending" || c.status === "locked");
  if (live) { refuse(`already on the docket: claim ${live.id} is ${live.status} at window ${live.window_id}`); continue; }
  const last = docket[docket.length - 1];
  const payload = act.payload ?? {};
  const slug = `${payload.by ?? act.actor}/${payload.slug}`;
  const { rows: [standing] } = await q("SELECT id::text FROM marks WHERE slug = $1 AND status = 'standing' LIMIT 1", [slug]);
  const household = await householdKeyFor(pool, act.actor);
  const status = payload.put_forward === true ? "pending" : "draft";
  console.log(`${head} → ${WRITE ? "WRITE" : "WOULD WRITE"} — a ${status} claim for ${slug} at window ${win.id}, household ${household}, supersedes ${standing?.id ?? "nothing (fresh slug)"}; replaces refused ${last.id} (window ${last.window_id}: ${last.refusal_check ?? "?"})`);
  plan.push({ act, payload, household, last, slug });
}

// ── then write, or not ──────────────────────────────────────────────────────
let written = 0;
if (WRITE) {
  for (const { act, payload, household, last, slug } of plan) {
    const row = {
      action: act.action, actor: act.actor, object: act.object,
      payload: JSON.stringify({ ...payload, _redocket: { of: last.id, reason: REASON, at: new Date().toISOString() } }),
    };
    await withHousehold(pool, household, (client) => claimTxFromJournal(client, row, null, { household, actId: act.id }));
    const { rows: [fresh] } = await q(
      `SELECT id, status, window_id, supersedes FROM claims
        WHERE data->>'_act_id' = $1 AND status IN ('pending','draft') ORDER BY submitted_at DESC LIMIT 1`, [String(act.id)]);
    if (!fresh) { console.error(`  act ${act.id} → NO ROW CAME BACK for ${slug} — the transaction committed nothing visible; stopping`); await pool.end(); process.exit(1); }
    console.log(`    ↳ wrote claim ${fresh.id} ${fresh.status} at window ${fresh.window_id}, supersedes ${fresh.supersedes ?? "null"}`);
    written++;
  }
}
await pool.end();
console.log(`${WRITE ? "written" : "would write"}: ${WRITE ? written : plan.length} · refused: ${refused}`);
process.exit(refused ? 1 : 0);
