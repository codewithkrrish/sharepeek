# sharepeek

Preview how a link will look when it's shared — on X, Discord, LinkedIn and WhatsApp — before you actually post it. Type a title, description and image URL, and all four cards update as you type. It also writes the Open Graph meta tags for you, ready to paste into your page.

No server, no build step, no dependencies. Open `index.html` in a browser and it works. Nothing you type leaves your machine — the shareable link just encodes your inputs in the page URL's hash.

## Why I built this

I kept shipping project pages, posting the link, and only then finding out the card looked wrong — title cut off mid-word, no image because I'd forgotten the tag, or a description from three deploys ago because the platform had cached it. Every fix meant another deploy and another post to check. I wanted the check to happen *before* the post, in ten seconds, without signing up for a link-preview service.

So sharepeek is the tool I now run through before sharing anything: paste the title and description I'm about to use, glance at the four cards, fix the one that looks off, copy the tags.

## Try it

Open `index.html` in any browser, or click **Load a sample** to see it working immediately. Fill in your own values and watch the previews change live.

What you get, per link:

- Four live previews: X, Discord, LinkedIn, WhatsApp
- A checks panel: title/description length warnings, missing image, non-HTTPS image, unparseable URL
- The image's real loaded dimensions and ratio (1200 × 630, ratio 1.91:1, is the usual sweet spot)
- Copyable Open Graph + Twitter Card tags
- A shareable link to the preview itself, so you can send someone the exact card you're seeing

## Example output

For a title of "My Project — a tiny tool that does one thing well" and a 1200 × 630 image, the generated tags look like this:

```html
<meta property="og:type" content="website">
<meta property="og:title" content="My Project — a tiny tool that does one thing well">
<meta property="og:description" content="A single-page tool with no backend. Open it, use it, close it.">
<meta property="og:image" content="https://example.com/og-image.png">
<meta property="og:url" content="https://example.com/my-project">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="My Project — a tiny tool that does one thing well">
<meta name="twitter:description" content="A single-page tool with no backend. Open it, use it, close it.">
<meta name="twitter:image" content="https://example.com/og-image.png">
```

Empty fields are skipped, so you never get a tag with nothing in it, and quotes in your text are escaped.

## The checks, honestly

The length numbers are recommendations, not rules — nothing breaks if your title is 80 characters, it just gets cut off somewhere you didn't pick. The per-platform cutoffs in the previews are eyeballed from real cards, not spec: platforms change their rendering without telling anyone. And no preview tool can beat a platform's cache — if you've already shared the URL once, the old card can stick around for days no matter how good your new tags are. When a live post still looks wrong after fixing the tags, the platform's own card validator/debugger is the next step, not this page.

Other honest limits:

- The preview can't fetch your page's actual tags — it renders what you type, so a typo in your pasted title is a typo in the preview too. That's by design (no server), but it means the tool checks your *intended* card, not your *deployed* one.
- Some image hosts block hotlinking, so an image can load fine on your own site and fail here. The checks panel says so when it happens.
- WhatsApp only generates a preview for the first link in a message, and only when the sender's number isn't too new — nothing any preview tool can change.

## How it's built

Three files, no framework:

- `index.html` — the form, the four preview cards, the tags output
- `style.css` — layout plus just enough platform flavour in each card to be recognisable
- `sharepeek.js` — the logic, split in two: a DOM-free core (escaping, truncation, tag generation, validation, hash round-trip) and a thin browser wiring section at the bottom. The core is what the tests exercise.

## Tests

The core runs under Node with no DOM:

```
node --test tests/sharepeek.test.js
```

Covers: HTML escaping, truncation at word boundaries, domain extraction and bad URLs, tag generation (including skipped empty fields and the small-card fallback when there's no image), validation warnings, per-platform truncation, and hash serialisation round-trips.

## Project structure

```
sharepeek/
  index.html            # the whole tool: form + previews + tags output
  style.css             # layout and card styling
  sharepeek.js          # DOM-free core + browser wiring
  tests/
    sharepeek.test.js   # node:test suite for the core
  LICENSE
  .gitignore
```

## License

MIT — see [LICENSE](LICENSE).

Built by [Krrish](https://github.com/codewithkrrish).
