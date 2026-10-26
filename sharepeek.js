/* sharepeek — core logic.
 *
 * This file is deliberately DOM-free above the wiring section at the
 * bottom, so the same functions run in a browser and under Node tests.
 * No dependencies, no build step.
 */

// Recommended lengths for Open Graph content. These are the numbers most
// link checkers quote; going past them doesn't break anything, the text
// just gets cut off somewhere you didn't choose.
const TITLE_RECOMMENDED = 60;
const DESCRIPTION_RECOMMENDED = 155;

// Display cutoffs per platform, eyeballed from real previews. Platforms
// change these quietly, so treat them as approximate, not spec.
const PLATFORM_LIMITS = {
  x: { title: 70, description: 200 },
  discord: { title: 256, description: 200 },
  linkedin: { title: 150, description: 200 },
  whatsapp: { title: 80, description: 160 },
};

// Fields that survive a round-trip through the shareable URL hash.
const STATE_FIELDS = ["url", "title", "description", "image", "site"];

/** Escape text for safe insertion into HTML. */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Shorten text to `max` characters, cutting at a word boundary where
 * possible and marking the cut with an ellipsis. Short text passes
 * through untouched.
 */
function truncate(text, max) {
  const value = String(text || "");
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1).trimEnd();
  return cut + "…";
}

/** Hostname for a URL, or "" when the URL doesn't parse. */
function domainFromUrl(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Build the Open Graph + Twitter Card meta tags for `data`.
 * Empty fields are skipped, so the output never contains a tag with
 * nothing in it. Values are attribute-escaped.
 */
function buildMetaTags(data) {
  const d = data || {};
  const lines = [];
  const add = (property, value) => {
    if (value) lines.push(`<meta property="${property}" content="${escapeHtml(value)}">`);
  };
  const addName = (name, value) => {
    if (value) lines.push(`<meta name="${name}" content="${escapeHtml(value)}">`);
  };

  add("og:type", "website");
  add("og:title", d.title);
  add("og:description", d.description);
  add("og:image", d.image);
  add("og:url", d.url);
  add("og:site_name", d.site);
  addName("twitter:card", d.image ? "summary_large_image" : "summary");
  addName("twitter:title", d.title);
  addName("twitter:description", d.description);
  addName("twitter:image", d.image);
  return lines.join("\n");
}

/**
 * Check a set of inputs and return human-readable warnings.
 * An empty array means nothing worth flagging — not a guarantee the
 * preview will look perfect everywhere, platforms have their own ideas.
 */
function validate(data) {
  const d = data || {};
  const warnings = [];
  if (!d.title) warnings.push("No title yet — previews will fall back to the page URL.");
  else if (d.title.length > TITLE_RECOMMENDED)
    warnings.push(`Title is ${d.title.length} characters; past ~${TITLE_RECOMMENDED} it gets cut off on most platforms.`);
  if (!d.description) warnings.push("No description yet — previews will look bare.");
  else if (d.description.length > DESCRIPTION_RECOMMENDED)
    warnings.push(`Description is ${d.description.length} characters; past ~${DESCRIPTION_RECOMMENDED} it gets cut off.`);
  if (!d.image) warnings.push("No image — cards will render small, without a preview picture.");
  if (d.url && !domainFromUrl(d.url)) warnings.push("Page URL doesn't look like a real URL.");
  if (d.image && !/^https?:\/\//i.test(d.image))
    warnings.push("Image URL should start with https:// — plain http images are often blocked.");
  return warnings;
}

/**
 * Shape `data` into one platform's preview: truncated title and
 * description, domain, and image. Unknown platforms get the raw values.
 */
function platformPreview(platform, data) {
  const d = data || {};
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) {
    return { title: d.title || "", description: d.description || "", domain: domainFromUrl(d.url), image: d.image || "" };
  }
  return {
    title: truncate(d.title || "", limits.title),
    description: truncate(d.description || "", limits.description),
    domain: domainFromUrl(d.url),
    image: d.image || "",
  };
}

/** Encode form data into a URL-hash string for the shareable link. */
function serializeState(data) {
  const params = new URLSearchParams();
  for (const field of STATE_FIELDS) {
    if (data[field]) params.set(field, data[field]);
  }
  const query = params.toString();
  return query ? "#" + query : "";
}

/** Decode a URL-hash string back into form data. Unknown keys ignored. */
function parseState(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const data = {};
  for (const field of STATE_FIELDS) {
    const value = params.get(field);
    if (value) data[field] = value;
  }
  return data;
}

// Export for Node tests; in the browser `module` is undefined and this
// block is skipped.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TITLE_RECOMMENDED,
    DESCRIPTION_RECOMMENDED,
    PLATFORM_LIMITS,
    STATE_FIELDS,
    escapeHtml,
    truncate,
    domainFromUrl,
    buildMetaTags,
    validate,
    platformPreview,
    serializeState,
    parseState,
  };
}

/* ---------------- Browser wiring (skipped under Node) ---------------- */

if (typeof document !== "undefined") {
  const PLATFORMS = ["x", "discord", "linkedin", "whatsapp"];
  const LABELS = { x: "X", discord: "Discord", linkedin: "LinkedIn", whatsapp: "WhatsApp" };

  function readForm() {
    const data = {};
    for (const field of STATE_FIELDS) {
      data[field] = document.getElementById("field-" + field).value.trim();
    }
    return data;
  }

  function render() {
    const data = readForm();

    // Checks panel.
    const warnings = validate(data);
    const checksEl = document.getElementById("checks");
    checksEl.innerHTML = warnings.length
      ? warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")
      : "<li class=\"ok\">Looks good — nothing to flag.</li>";

    // Meta tags output.
    document.getElementById("meta-output").textContent = buildMetaTags(data);

    // Shareable link (state lives in the hash, nothing sent anywhere).
    const hash = serializeState(data);
    document.getElementById("share-link").value = hash
      ? window.location.href.split("#")[0] + hash
      : "";
    if (hash) history.replaceState(null, "", hash);

    // Platform previews.
    for (const platform of PLATFORMS) {
      const preview = platformPreview(platform, data);
      const card = document.getElementById("preview-" + platform);
      const titleEl = card.querySelector(".card-title");
      const descEl = card.querySelector(".card-desc");
      const domainEl = card.querySelector(".card-domain");
      const imgWrap = card.querySelector(".card-image");
      titleEl.textContent = preview.title || preview.domain || "Untitled link";
      descEl.textContent = preview.description || "";
      domainEl.textContent = preview.domain || "your-site.com";
      if (preview.image) {
        imgWrap.innerHTML = "";
        const img = document.createElement("img");
        img.src = preview.image;
        img.alt = "";
        img.onload = () => {
          const ratio = img.naturalWidth / img.naturalHeight;
          const note = document.getElementById("image-note");
          note.textContent = `Image loaded: ${img.naturalWidth} × ${img.naturalHeight} (ratio ${ratio.toFixed(2)}:1 — 1.91:1 is the usual sweet spot).`;
        };
        img.onerror = () => {
          document.getElementById("image-note").textContent =
            "That image didn't load — check the URL, or the host may be blocking hotlinks.";
        };
        imgWrap.appendChild(img);
      } else {
        imgWrap.innerHTML = "<div class=\"no-image\">No image</div>";
      }
    }
  }

  function fillForm(data) {
    for (const field of STATE_FIELDS) {
      document.getElementById("field-" + field).value = data[field] || "";
    }
  }

  function copyText(text, button) {
    const done = () => {
      const original = button.textContent;
      button.textContent = "Copied";
      setTimeout(() => (button.textContent = original), 1500);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  // Fallback for browsers/contexts without the async clipboard API.
  function fallbackCopy(text, done) {
    const box = document.createElement("textarea");
    box.value = text;
    document.body.appendChild(box);
    box.select();
    try {
      document.execCommand("copy");
    } catch {
      /* clipboard unavailable; user can select manually */
    }
    box.remove();
    done();
  }

  document.addEventListener("DOMContentLoaded", () => {
    for (const field of STATE_FIELDS) {
      document.getElementById("field-" + field).addEventListener("input", render);
    }
    document.getElementById("btn-sample").addEventListener("click", () => {
      fillForm({
        url: "https://example.com/my-project",
        title: "My Project — a tiny tool that does one thing well",
        description: "A single-page tool with no backend. Open it, use it, close it. Nothing to install and nothing phoning home.",
        image: "https://picsum.photos/seed/sharepeek/1200/630",
        site: "Example",
      });
      render();
    });
    document.getElementById("btn-clear").addEventListener("click", () => {
      fillForm({});
      document.getElementById("image-note").textContent = "";
      history.replaceState(null, "", window.location.pathname);
      render();
    });
    document.getElementById("btn-copy-meta").addEventListener("click", (e) => {
      copyText(document.getElementById("meta-output").textContent, e.currentTarget);
    });
    document.getElementById("btn-copy-link").addEventListener("click", (e) => {
      copyText(document.getElementById("share-link").value, e.currentTarget);
    });

    // Restore state from a shared link, if present.
    const restored = parseState(window.location.hash);
    if (Object.keys(restored).length) fillForm(restored);
    render();
  });
}
