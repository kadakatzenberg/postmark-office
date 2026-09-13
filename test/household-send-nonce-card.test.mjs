// A send retry key is accepted by the household door on the connector skin,
// so that skin must advertise it. REST keeps its frozen field surface.

import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";

import { fixtureDb } from "./fixture.mjs";
import { householdApex } from "../src/household-apex.mjs";
import { TOOLS, callTool } from "../src/mcp.mjs";

const SCHEMAS = Object.fromEntries(TOOLS.map((t) => [t.name, t.inputSchema?.properties ?? {}]));
const REQUIRED = Object.fromEntries(TOOLS.map((t) => [t.name, t.inputSchema?.required ?? []]));
const KEY = { household: "keemin", handles: new Set(["wright"]), ghId: "42", ghLogin: "keeminlee" };

const dir = mkdtempSync(join(tmpdir(), "pm-nonce-card-"));
const dbPath = join(dir, "fixture.db");
fixtureDb(dbPath).close();
const db = new DatabaseSync(dbPath, { readOnly: true });
after(() => { db.close(); rmSync(dir, { recursive: true, force: true }); });

const worldBlock = async () => ({ sited: true, unreadable: false });
const ctx = (extra = {}) => ({ db, worldBlock, schemas: SCHEMAS, schemaRequired: REQUIRED, ...extra });
const send = (answer) => answer.acts.find((a) => a.act === "send");

test("MCP send affordance advertises the accepted nonce without widening REST or generic slim reads", async () => {
  const rest = await householdApex({}, KEY, ctx());
  const slimOnly = await householdApex({}, KEY, ctx({ slim: true }));
  const mcp = await householdApex({}, KEY, ctx({ slim: true, advertiseRetryNonce: true }));
  const card = await householdApex({ read: "send" }, KEY, ctx({ slim: true, advertiseRetryNonce: true }));

  assert.equal("nonce" in send(rest).fields, false,
    "the frozen REST send surface stays unchanged");
  assert.equal("nonce" in send(slimOnly).fields, false,
    "slim alone does not widen bundled morning-page surfaces");
  assert.equal("nonce" in send(mcp).fields, true,
    "the MCP capability index advertises the retry key the door already accepts");
  assert.equal("nonce" in card.card.fields, true,
    "the explicit MCP send card describes the same accepted retry key");
  assert.equal(card.card.fields.nonce.required, undefined,
    "nonce is optional, not part of the letter's required payload");
});

test("the actual MCP household dispatcher turns on the nonce affordance", async () => {
  const answer = await callTool("household", {}, {
    db, key: null, meta: {}, asOf: "fixture", canWrite: false,
    clone: null, pen: null, odb: null, dbPath, rdb: null,
  });
  assert.equal("nonce" in send(answer).fields, true,
    "callTool household must expose the retry key without callers knowing an internal context flag");
});
