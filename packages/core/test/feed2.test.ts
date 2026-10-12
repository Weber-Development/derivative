import { describe, expect, it } from "vitest";
import {
  createFeed,
  localizeRelease,
  parseFeed,
  type Release,
  renderAtom,
  renderJsonFeed,
  renderReleases,
  toFeedV1,
} from "../src";

const release: Release = {
  id: "2.0.0",
  version: "2.0.0",
  date: "2026-10-01",
  title: "Dark mode",
  summary: "Switch it on.",
  importance: "major",
  media: [
    { type: "image", url: "https://acme.ch/dark.png", alt: "Dark dashboard" },
    { type: "video", url: "/demo.mp4", alt: "Demo" },
  ],
  links: [{ label: "Read the guide", url: "https://acme.ch/guide" }],
  audience: ["beta"],
  translations: {
    de: {
      title: "Dunkelmodus",
      summary: "Einschalten.",
      entries: { "ACME-1": "Dunkelmodus für das Dashboard" },
    },
  },
  entries: [
    {
      type: "feature",
      text: "Dark mode for the dashboard",
      id: "ACME-1",
      target: "#theme",
      audience: ["beta"],
    },
  ],
};

describe("feed format 2", () => {
  it("writes version 2 by default and round-trips through parseFeed", () => {
    const feed = createFeed([release], { generatedAt: null });
    expect(feed.version).toBe(2);
    expect(parseFeed(JSON.parse(JSON.stringify(feed)))).toEqual(feed);
  });

  it("reads format 1 and turns image into media", () => {
    const feed = parseFeed({
      version: 1,
      releases: [
        { id: "1.0.0", image: "https://acme.ch/a.png", entries: [{ type: "fix", text: "x" }] },
      ],
    });
    expect(feed.version).toBe(2);
    expect(feed.releases[0]?.media).toEqual([
      { type: "image", url: "https://acme.ch/a.png", alt: "" },
    ]);
  });

  it("drops unsafe media and link URLs and unknown importance", () => {
    const feed = parseFeed({
      version: 2,
      releases: [
        {
          id: "1",
          importance: "loud",
          media: [
            { type: "image", url: "javascript:alert(1)" },
            { type: "audio", url: "/x" },
          ],
          links: [
            { label: "Bad", url: "javascript:alert(1)" },
            { label: "Ok", url: "/ok" },
          ],
          entries: [],
        },
      ],
    });
    const r = feed.releases[0];
    expect(r?.media).toBeUndefined();
    expect(r?.importance).toBeUndefined();
    expect(r?.links).toEqual([{ label: "Ok", url: "/ok" }]);
  });

  it("rejects other versions", () => {
    expect(() => parseFeed({ version: 3, releases: [] })).toThrow(/Not a Derivative feed/);
  });

  it("converts to format 1 for older widgets", () => {
    const v1 = toFeedV1(createFeed([release], { generatedAt: null }));
    expect(v1.version).toBe(1);
    const r = v1.releases[0] as Record<string, unknown>;
    expect(r.image).toBe("https://acme.ch/dark.png");
    for (const key of ["media", "links", "importance", "audience", "translations"]) {
      expect(r).not.toHaveProperty(key);
    }
    expect(JSON.stringify(v1)).not.toContain("ACME-1");
    expect(createFeed([release], { format: 1, generatedAt: null }).version).toBe(1);
  });
});

describe("translations", () => {
  it("localizes title, summary and entries by id, with region fallback", () => {
    const de = localizeRelease(release, "de-CH");
    expect(de.title).toBe("Dunkelmodus");
    expect(de.entries[0]?.text).toBe("Dunkelmodus für das Dashboard");
    expect(localizeRelease(release, "fr")).toBe(release);
    expect(localizeRelease(release, undefined)).toBe(release);
  });

  it("renders the translated texts", () => {
    expect(renderReleases([release], { lang: "de" })).toContain("Dunkelmodus");
    expect(renderReleases([release], { lang: "en" })).toContain("Dark mode");
  });

  it("ignores invalid language keys", () => {
    const feed = parseFeed({
      version: 2,
      releases: [
        { id: "1", entries: [], translations: { "<x>": { title: "x" }, de: { title: "Hallo" } } },
      ],
    });
    expect(Object.keys(feed.releases[0]?.translations ?? {})).toEqual(["de"]);
  });
});

describe("media and links in output", () => {
  it("renders images, videos and actions", () => {
    const html = renderReleases([release]);
    expect(html).toContain(
      '<img class="dv-image" part="media" src="https://acme.ch/dark.png" alt="Dark dashboard"',
    );
    expect(html).toContain('<video class="dv-media"');
    expect(html).toContain('class="dv-action"');
    expect(html).toContain("Read the guide");
  });

  it("escapes and filters unsafe URLs", () => {
    const html = renderReleases([
      {
        ...release,
        media: [{ type: "image", url: "javascript:x" }],
        links: [{ label: "<b>", url: "javascript:x" }],
      },
    ]);
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<b>");
  });

  it("keeps the first image in the JSON Feed and Atom output", () => {
    const feed = createFeed([release], { link: "https://acme.ch/changelog", generatedAt: null });
    expect(JSON.parse(renderJsonFeed(feed)).items[0].image).toBe("https://acme.ch/dark.png");
    expect(renderAtom(feed)).toContain("dark.png");
  });
});
