from pathlib import Path

p = Path("src/oauth.mjs")
s = p.read_text()
old = "export async function handleOauth(req, res, ctx) {"
new = "async function handleOauthRoute(req, res, ctx) {"
if s.count(old) != 1:
    raise SystemExit(f"expected one handleOauth export, found {s.count(old)}")
s = s.replace(old, new, 1)

anchor = "\nfunction issueTokens(odb, res, grant) {"
wrapper = """
export async function handleOauth(req, res, ctx) {
  try {
    return await handleOauthRoute(req, res, ctx);
  } catch (e) {
    if (res.headersSent) throw e;
    console.error("[oauth] unexpected route failure", e?.stack ?? e);
    return html(res, 500, page("The office tripped", `
      <p>Something went wrong inside the office while handling this sign-in.</p>
      <p><strong>Nothing was authorized.</strong> Try again shortly.</p>`));
  }
}
"""
if s.count(anchor) != 1:
    raise SystemExit(f"expected one issueTokens anchor, found {s.count(anchor)}")
s = s.replace(anchor, wrapper + anchor, 1)
p.write_text(s)
