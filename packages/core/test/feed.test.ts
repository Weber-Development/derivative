import { describe, expect, it } from "vitest";
import {
  compareVersions,
  createFeed,
  getUnread,
  inlineMarkdown,
  parseFeed,
  type Release,
  renderAtom,
  renderPage,
} from "../src";

const releases: Release[] = [
  { id: "1.0.0", version: "1.0.0", date: "2026-08-01", entries: [{ type: "fix", text: "Old" }] },
  {
    id: "1.10.0",
    version: "1.10.0",
    entries: [
      { type: "fix", text: "Fixed" },
      { type: "feature", text: "Added" },
    ],
  },
  { id: "1.2.0", version: "1.2.0", entries: [{ type: "feature", text: "Mid" }] },
];

describe("createFeed", () => {
  it("sorts releases and entries", () => {
    const feed = createFeed(releases, {
      generatedAt: null,
      highlights: { "1.10.0": { title: "Big" } },
    });
    expect(feed.releases.map((r) => r.id)).toEqual(["1.10.0", "1.2.0", "1.0.0"]);
    expect(feed.releases[0]?.title).toBe("Big");
    expect(feed.releases[0]?.entries.map((e) => e.type)).toEqual(["feature", "fix"]);
    expect(feed.generatedAt).toBeUndefined();
  });

  it("compares versions", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBe(1);
    expect(compareVersions("2.0.0-beta.2", "2.0.0")).toBe(-1);
    expect(compareVersions("2.0.0-beta.10", "2.0.0-beta.2")).toBe(1);
    expect(compareVersions("v1.0", "1.0.0")).toBe(0);
  });
});

describe("parseFeed", () => {
  it("rejects other JSON and drops unsafe links", () => {
    expect(() => parseFeed({ releases: [] })).toThrow(/Not a Derivative feed/);
    const feed = parseFeed({
      version: 1,
      releases: [
        {
          id: "1",
          extra: true,
          entries: [{ type: "weird", text: "x", link: "javascript:alert(1)" }, { text: "" }],
        },
      ],
    });
    expect(feed.releases[0]).toEqual({ id: "1", entries: [{ type: "other", text: "x" }] });
  });
});

describe("getUnread", () => {
  const feed = createFeed(
    [
      { id: "3", date: "2026-10-01", entries: [{ type: "feature", text: "c" }] },
      { id: "2", date: "2026-09-20", entries: [{ type: "feature", text: "b" }] },
      { id: "1", date: "2026-06-01", entries: [{ type: "feature", text: "a" }] },
    ],
    { generatedAt: null },
  );
  const now = new Date("2026-10-05");

  it("counts releases newer than the last seen one", () => {
    expect(getUnread(feed, "2").map((r) => r.id)).toEqual(["3"]);
    expect(getUnread(feed, "3")).toEqual([]);
    expect(getUnread(feed, "gone")).toEqual([]);
  });

  it("shows recent releases to first-time readers", () => {
    expect(getUnread(feed, null, { now }).map((r) => r.id)).toEqual(["3", "2"]);
    expect(getUnread(feed, null, { now, firstVisitDays: 7 }).map((r) => r.id)).toEqual(["3"]);
  });
});

describe("rendering", () => {
  it("escapes HTML and renders a Markdown subset", () => {
    expect(inlineMarkdown('<img onerror="x"> **bold** `a<b` [docs](https://x.ch/?a=1&b=2)')).toBe(
      '&lt;img onerror=&quot;x&quot;&gt; <strong>bold</strong> <code>a&lt;b</code> <a href="https://x.ch/?a=1&amp;b=2" rel="noopener">docs</a>',
    );
    expect(inlineMarkdown("[x](javascript:alert(1))")).not.toContain("href");
    expect(inlineMarkdown("snake_case_name and *em*")).toBe("snake_case_name and <em>em</em>");
  });

  it("renders a page and an Atom feed", () => {
    const feed = createFeed(releases, {
      title: "Acme",
      link: "https://acme.ch/changelog",
      generatedAt: null,
    });
    const page = renderPage(feed, { lang: "de" });
    expect(page).toContain('<html lang="de">');
    expect(page).toContain(">Neu</span>");
    expect(page).toContain('<time datetime="2026-08-01">1. August 2026</time>');
    const atom = renderAtom(feed, { selfUrl: "https://acme.ch/changelog.xml" });
    expect(atom).toContain("<id>https://acme.ch/changelog#1-10-0</id>");
    expect(atom).toContain("<updated>2026-08-01T00:00:00Z</updated>");
    expect(atom.match(/<entry>/g)).toHaveLength(3);
  });
});

describe("renderJsonFeed", () => {
  it("writes a valid JSON Feed 1.1", async () => {
    const { renderJsonFeed } = await import("../src");
    const json = JSON.parse(
      renderJsonFeed(
        {
          version: 1,
          title: "Acme",
          link: "https://acme.ch/changelog",
          releases: [
            {
              id: "1.2.0",
              version: "1.2.0",
              date: "2026-10-01",
              title: "Dark mode",
              summary: "Now with **dark** mode.",
              entries: [{ type: "feature", text: "Dark mode" }],
            },
          ],
        },
        { selfUrl: "https://acme.ch/feed.json", lang: "de" },
      ),
    );
    expect(json).toMatchObject({
      version: "https://jsonfeed.org/version/1.1",
      title: "Acme",
      home_page_url: "https://acme.ch/changelog",
      feed_url: "https://acme.ch/feed.json",
      language: "de",
    });
    expect(json.items[0]).toMatchObject({
      id: "https://acme.ch/changelog#1-2-0",
      url: "https://acme.ch/changelog#1-2-0",
      title: "Dark mode",
      summary: "Now with dark mode.",
      date_published: "2026-10-01T00:00:00Z",
    });
    expect(json.items[0].content_html).toContain("Dark mode");
  });
});
