const test = require("node:test");
const assert = require("node:assert/strict");
const {
  escapeHtml,
  truncate,
  domainFromUrl,
  buildMetaTags,
  validate,
  platformPreview,
  serializeState,
  parseState,
} = require("../sharepeek.js");

test("escapeHtml escapes markup and quotes", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  assert.equal(escapeHtml("plain"), "plain");
});

test("truncate passes short text through and marks cuts", () => {
  assert.equal(truncate("short", 70), "short");
  assert.equal(truncate("exactly", 7), "exactly");
  const cut = truncate("one two three four five", 10);
  assert.ok(cut.endsWith("…"));
  assert.ok(cut.length <= 10);
});

test("domainFromUrl strips www and rejects junk", () => {
  assert.equal(domainFromUrl("https://www.example.com/page"), "example.com");
  assert.equal(domainFromUrl("https://sub.example.com/"), "sub.example.com");
  assert.equal(domainFromUrl("not a url"), "");
  assert.equal(domainFromUrl(""), "");
});

test("buildMetaTags includes og + twitter tags and skips empties", () => {
  const tags = buildMetaTags({
    title: "Hello",
    description: "World",
    image: "https://example.com/img.png",
    url: "https://example.com/",
    site: "Example",
  });
  assert.match(tags, /og:title/);
  assert.match(tags, /twitter:card" content="summary_large_image/);
  assert.match(tags, /og:site_name/);

  const sparse = buildMetaTags({ title: "Only title" });
  assert.match(sparse, /og:title/);
  assert.doesNotMatch(sparse, /og:image/);
  assert.match(sparse, /twitter:card" content="summary"/);
});

test("buildMetaTags escapes quotes in values", () => {
  const tags = buildMetaTags({ title: 'Say "hi"' });
  assert.match(tags, /Say &quot;hi&quot;/);
  assert.doesNotMatch(tags, /Say "hi"/);
});

test("validate flags missing fields, long text, and bad URLs", () => {
  assert.equal(validate({}).length > 0, true);
  assert.equal(validate({
    title: "t".repeat(61),
    description: "d".repeat(200),
    url: "https://example.com/",
    image: "https://example.com/i.png",
  }).length, 2);
  const warnings = validate({ url: "junk", image: "img.png" });
  assert.ok(warnings.some((w) => /real URL/.test(w)));
  assert.ok(warnings.some((w) => /https/.test(w)));
  assert.equal(validate({
    title: "Fine title",
    description: "Fine description.",
    url: "https://example.com/",
    image: "https://example.com/i.png",
  }).length, 0);
});

test("platformPreview truncates per platform and keeps unknown platforms raw", () => {
  const data = { title: "t".repeat(100), description: "d".repeat(300), url: "https://www.example.com/x" };
  const x = platformPreview("x", data);
  assert.ok(x.title.length <= 70);
  assert.equal(x.domain, "example.com");
  const discord = platformPreview("discord", data);
  assert.ok(discord.title.length > x.title.length);
  const other = platformPreview("nope", data);
  assert.equal(other.title.length, 100);
});

test("state round-trips through the hash and ignores unknown keys", () => {
  const data = { title: "Hello & goodbye", url: "https://example.com/?a=1" };
  const restored = parseState(serializeState(data));
  assert.deepEqual(restored, data);
  assert.deepEqual(parseState("#title=Hi&surprise=1"), { title: "Hi" });
  assert.equal(serializeState({}), "");
});
