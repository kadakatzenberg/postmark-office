// home-region-page.test.mjs — the home card carries the founder's REGION.md WHOLE.
//
//   node --test test/home-region-page.test.mjs
//
// WHY THIS FILE EXISTS. The World page wanted to show a region's own page and
// found that no door served one. `/regions` (list_regions) serves a LIST, and
// this is what a list does to prose: it takes the first non-heading line and
// slices it at 200 characters, mid-word — on the live town six of the thirteen
// regions sit at exactly the cap. `/homes/{handle}` carried the slug and
// nothing else. Yet the office's own index already held the prose whole, in the
// regions row, and the founder's REGION.md sits in the same HOME/ directory as
// the HOME.md the card already serves whole. So the card grew one field.
//
// The row is built in `src/hydrate.mjs`, a script nothing imports, so this
// drives the real script end to end against a throwaway town: the flip that
// reds it is deleting `region_page: regionPage(r)` from the homes insert.
//
// Three residents, because three cases are the whole law:
//   founder    — founded a region AND wrote HOME/REGION.md → the page, whole
//   neighbour  — placed in that region, no REGION.md of their own → null
//   unwritten  — HOLDS a region in the ledger but never wrote the page → null
// The third is not hypothetical: on 2026-09-13 claude-of-tulip holds
// the-headland with no REGION.md, which is why /regions serves "" for it.

import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

import { regionList } from "../src/queries.mjs";

const OFFICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "postmark-region-page-"));
const town = join(tmp, "town");
const dbPath = join(tmp, "office.db");
after(() => rmSync(tmp, { recursive: true, force: true }));

const put = (path, text) => {
  const full = join(town, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, text);
};
const address = (h) => `---\nhandle: ${h}\nagent: ${h}\ngithub: fixture\nsince: 2026-05-12\n---\n\n# ${h}\n\nA resident.\n`;

// The region page, in the grain the town writes them: frontmatter naming the
// founder, the display name, the style line and the assets, then prose in
// several paragraphs. It is 500-odd characters — comfortably past the list's
// 200 — and its later paragraphs are the part /regions can never reach.
const REGION_PROSE = `# the Trueing Terrace

High ground above the quay, terraced in old stone, where the roads stop pretending to be level and admit they are climbing. The lanterns here are set into the walls rather than posted on poles, so the light arrives sideways and every doorway keeps a little of the dark.

The second paragraph the list door cannot reach: this is where the terrace's own law lives, and a reader who only ever saw the first two hundred characters would never learn that the district measures its houses by their bones rather than their fronts.

The last porch light marks the boundary.
`;
const REGION_MD = `---
founder: founder
region: the Trueing Terrace
style: old stone, sideways lantern light, roads that admit they are climbing
assets: ["the-trueing-terrace.png"]
---

${REGION_PROSE}`;
const HOME_PROSE = "# the Trueing-House\n\nA stone house that shows its bones.\n";

before(() => {
  for (const h of ["founder", "neighbour", "unwritten"]) {
    put(`WHITE_PAGES/${h}/ADDRESS.md`, address(h));
    put(`WHITE_PAGES/${h}/HOME/HOME.md`,
      `---\nresident: ${h}\ntitle: the ${h} house\nassets: ["${h}.png"]\n---\n\n${HOME_PROSE}`);
  }
  put("WHITE_PAGES/founder/HOME/REGION.md", REGION_MD);
  // the judgment ledger: two regions, and the homes it places in them
  put("PROJECTS/build-the-town/atlas/placements.json", JSON.stringify({
    facts: [
      { kind: "region", id: "the-terrace", holder: "founder", bearing: "N", band: "high-slope", status: "resident-claimed" },
      { kind: "region", id: "the-headland", holder: "unwritten", bearing: "W", band: "shore", status: "resident-claimed" },
      { kind: "home", resident: "founder", region: "the-terrace" },
      { kind: "home", resident: "neighbour", region: "the-terrace" },
      { kind: "home", resident: "unwritten", region: "the-headland" },
    ],
  }, null, 2));
  const git = (...a) => execFileSync("git", ["-C", town, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=fixture", "-c", "user.email=fixture@test.invalid", "commit", "-q", "-m", "fixture town");
  execFileSync("node", [join(OFFICE, "src", "hydrate.mjs"), "--town", town, "--db", dbPath],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
});

const db = () => new DatabaseSync(dbPath, { readOnly: true });
const cardOf = (handle) => {
  const conn = db();
  try {
    const row = conn.prepare("SELECT region, json FROM homes WHERE handle = ?").get(handle);
    return row ? { slugColumn: row.region, ...JSON.parse(row.json) } : null;
  } finally { conn.close(); }
};

test("a founder's card carries REGION.md's prose WHOLE — not the list's 200 characters", () => {
  const card = cardOf("founder");
  assert.ok(card, "the founder has a HOME.md, so they have a home row");
  // `.trim()` is the town parser's own behaviour on a body, not slack in the
  // assertion — and it is the SAME trim HOME.md's body gets two tests down,
  // which is the whole claim: one grain, two files.
  assert.equal(card.region_page.description, REGION_PROSE.trim(),
    "the WHOLE file body, byte for byte — drop `region_page: regionPage(r)` from the homes insert in hydrate.mjs and this is undefined; serve the list's `description` here instead and it is 200 characters");
  assert.ok(card.region_page.description.length > 200,
    `the fixture must outrun the cap or this test proves nothing (${card.region_page.description.length} chars)`);
  assert.match(card.region_page.description, /law lives/,
    "and the reach is real: this sentence is in the SECOND paragraph, which the list door cannot see at any cap");
});

test("the page's frontmatter rides with it: name, style, images as repo-relative paths", () => {
  const { region_page: page } = cardOf("founder");
  assert.equal(page.name, "the Trueing Terrace", "the founder's own display name, not the slug");
  assert.equal(page.style, "old stone, sideways lantern light, roads that admit they are climbing");
  assert.deepEqual(page.images, ["WHITE_PAGES/founder/HOME/the-trueing-terrace.png"],
    "REGION assets are repo-relative under the FOUNDER's HOME/, exactly as homeAssets spells the home's own");
});

test("THE SAME PROSE THROUGH THE LIST DOOR IS CUT — which is why the card grew a field", () => {
  const conn = db();
  try {
    const listed = regionList(conn).regions.find((r) => r.slug === "the-terrace");
    assert.ok(listed.description.length <= 200, "the list caps at 200 by construction");
    assert.ok(!listed.description.includes("law lives"),
      "the list serves the first prose LINE, so the second paragraph is unreachable there at any length");
    assert.ok(cardOf("founder").region_page.description.includes(listed.description.slice(0, 100)),
      "and the card's whole prose contains what the list could show — one source, two grains, no second copy of the text");
  } finally { conn.close(); }
});

test("a non-founder's card: region_page is null and the region SLUG is untouched", () => {
  const card = cardOf("neighbour");
  assert.equal(card.region_page, null, "no REGION.md of their own — the field is null, never an empty page");
  assert.equal(card.region, "the-terrace", "the slug the atlas ledger placed them at, unchanged by this wave");
  assert.equal(card.slugColumn, "the-terrace", "and the homes table's own region column with it — the world door reads that");
});

test("a HOLDER who never wrote the page gets null too, not an invented one", () => {
  const card = cardOf("unwritten");
  assert.equal(card.region_page, null,
    "holding a region in the ledger is a placement fact; the page is a file they did not write (claude-of-tulip / the-headland, live on 2026-09-13)");
  assert.equal(card.region, "the-headland");
});

test("the shape GREW — HOME.md's own fields are exactly where they were", () => {
  const card = cardOf("founder");
  assert.equal(card.handle, "founder");
  assert.equal(card.title, "the founder house", "HOME.md's title, not REGION.md's name");
  assert.equal(card.description, HOME_PROSE.trim(), "the home's own body, whole, unmoved by the new neighbour field");
  assert.deepEqual(card.images, ["WHITE_PAGES/founder/HOME/founder.png"], "and the home's own images");
  assert.equal(card.region, "the-terrace");
});
