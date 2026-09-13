// A send retry key is accepted by the household door on the connector skin,
// so that skin must advertise it. REST keeps its frozen field surface.

import test from "node:test";
import assert from "node:assert/strict";

import { capabilityIndex } from "../src/household-apex.mjs";
import { TOOLS } from "../src/mcp.mjs";

const SCHEMAS = Object.fromEntries(TOOLS.map((t) => [t.name, t.inputSchema?.properties ?? {}]));
const REQUIRED = Object.fromEntries(TOOLS.map((t) => [t.name, t.inputSchema?.required ?? []]));

const sendFields = (ctx) => capabilityIndex(ctx).find((a) => a.act === "send").fields;

test("MCP send affordance advertises the accepted nonce without widening REST", () => {
  const rest = sendFields({ schemas: SCHEMAS, schemaRequired: REQUIRED });
  const mcp = sendFields({ slim: true, schemas: SCHEMAS, schemaRequired: REQUIRED });

  assert.equal("nonce" in rest, false,
    "the frozen REST send surface stays unchanged");
  assert.equal("nonce" in mcp, true,
    "the renegotiated MCP skin advertises the retry key the door already accepts");
});
