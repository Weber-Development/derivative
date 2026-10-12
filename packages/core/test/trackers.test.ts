import { describe, expect, it, vi } from "vitest";
import {
  LINEAR_CYCLES_QUERY,
  type NotionPage,
  parseJiraVersions,
  parseLinearCycles,
  parseNotionPages,
} from "../src";
import { readJiraVersions, readLinearCycles, readNotionPages } from "../src/node";

const cycles = [
  {
    number: 12,
    name: "Autumn polish",
    completedAt: "2026-10-04T10:00:00.000Z",
    issues: {
      nodes: [
        {
          identifier: "ENG-1",
          title: "Dark mode",
          url: "https://linear.app/acme/issue/ENG-1",
          labels: { nodes: [{ name: "Feature" }] },
        },
        { identifier: "ENG-2", title: "Rounding bug", labels: { nodes: [{ name: "Bug" }] } },
        {
          identifier: "ENG-3",
          title: "Refactor billing",
          labels: { nodes: [{ name: "internal" }] },
        },
        { identifier: "ENG-4", title: "Pro export", labels: { nodes: [{ name: "audience:Pro" }] } },
      ],
    },
  },
  { number: 11, completedAt: "2026-09-20T10:00:00.000Z", issues: { nodes: [] } },
];

describe("Linear", () => {
  it("makes a release per cycle with typed entries, audiences and exclusions", () => {
    const releases = parseLinearCycles(cycles);
    expect(releases).toHaveLength(1);
    const r = releases[0];
    expect(r).toMatchObject({
      id: "cycle-12",
      title: "Autumn polish",
      date: "2026-10-04T10:00:00.000Z",
    });
    expect(r?.entries.map((e) => [e.id, e.type])).toEqual([
      ["ENG-1", "feature"],
      ["ENG-2", "fix"],
      ["ENG-4", "improvement"],
    ]);
    expect(r?.entries[2]?.audience).toEqual(["pro"]);
    expect(r?.entries[0]?.link).toBe("https://linear.app/acme/issue/ENG-1");
  });

  it("takes extra label mappings", () => {
    const r = parseLinearCycles(cycles, { types: { feature: "improvement" }, excludeLabels: [] });
    expect(r[0]?.entries.map((e) => e.id)).toContain("ENG-3");
    expect(r[0]?.entries[0]?.type).toBe("improvement");
  });

  it("sends the query with the key as authorization", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ data: { cycles: { nodes: cycles } } }),
    ) as unknown as typeof fetch;
    const got = await readLinearCycles("ENG", { token: "lin_key", fetch: fetchMock });
    expect(got).toHaveLength(2);
    const [url, init] =
      (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0] ?? [];
    expect(url).toBe("https://api.linear.app/graphql");
    expect((init?.headers as Record<string, string> | undefined)?.authorization).toBe("lin_key");
    expect(JSON.parse(String(init?.body))).toMatchObject({
      query: LINEAR_CYCLES_QUERY,
      variables: { team: "ENG" },
    });
  });

  it("explains missing keys and API errors", async () => {
    const saved = process.env.LINEAR_API_KEY;
    delete process.env.LINEAR_API_KEY;
    await expect(readLinearCycles("ENG")).rejects.toThrow(/LINEAR_API_KEY/);
    if (saved) process.env.LINEAR_API_KEY = saved;
    const failing = vi.fn(async () =>
      Response.json({ errors: [{ message: "Nope" }] }),
    ) as unknown as typeof fetch;
    await expect(readLinearCycles("ENG", { token: "k", fetch: failing })).rejects.toThrow(/Nope/);
  });
});

const versions = [
  {
    version: {
      name: "v2.4.0",
      released: true,
      releaseDate: "2026-10-02",
      description: "Dark mode is here.",
    },
    issues: [
      { key: "ACME-7", fields: { summary: "Dark mode", issuetype: { name: "Story" }, labels: [] } },
      {
        key: "ACME-8",
        fields: { summary: "Crash on save", issuetype: { name: "Bug" }, labels: ["audience:beta"] },
      },
      {
        key: "ACME-9",
        fields: { summary: "Chore", issuetype: { name: "Task" }, labels: ["no-changelog"] },
      },
    ],
  },
  {
    version: { name: "Next", released: false },
    issues: [{ key: "ACME-10", fields: { summary: "Soon" } }],
  },
];

describe("Jira", () => {
  it("makes a release per released version", () => {
    const releases = parseJiraVersions(versions, { baseUrl: "https://acme.atlassian.net/" });
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      id: "2.4.0",
      version: "2.4.0",
      date: "2026-10-02",
      summary: "Dark mode is here.",
    });
    expect(releases[0]?.entries).toEqual([
      {
        type: "feature",
        text: "Dark mode",
        id: "ACME-7",
        link: "https://acme.atlassian.net/browse/ACME-7",
      },
      {
        type: "fix",
        text: "Crash on save",
        id: "ACME-8",
        link: "https://acme.atlassian.net/browse/ACME-8",
        audience: ["beta"],
      },
    ]);
  });

  it("uses names that are not versions as titles and can include unreleased ones", () => {
    const r = parseJiraVersions(versions, { includeUnreleased: true });
    expect(r[1]).toMatchObject({ id: "Next", title: "Next" });
  });

  it("reads versions, then the issues of each, with basic auth", async () => {
    const calls: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      calls.push(url);
      return url.includes("/versions")
        ? Response.json([
            { name: "2.4.0", released: true, releaseDate: "2026-10-02" },
            { name: "3.0.0", released: false },
          ])
        : Response.json({ issues: [{ key: "ACME-7", fields: { summary: "Dark mode" } }] });
    }) as unknown as typeof fetch;
    const got = await readJiraVersions("https://acme.atlassian.net", "ACME", {
      email: "a@b.c",
      token: "t",
      fetch: fetchMock,
    });
    expect(got).toHaveLength(1);
    expect(calls[0]).toBe("https://acme.atlassian.net/rest/api/3/project/ACME/versions");
    expect(calls[1]).toContain("/rest/api/3/search/jql?jql=");
    expect(decodeURIComponent(calls[1] ?? "")).toContain('fixVersion = "2.4.0"');
  });

  it("rejects bad project keys and missing credentials", async () => {
    await expect(
      readJiraVersions("https://x", "AC ME; DROP", { email: "a", token: "b" }),
    ).rejects.toThrow(/project key/);
    const saved = [process.env.JIRA_EMAIL, process.env.JIRA_API_TOKEN];
    delete process.env.JIRA_EMAIL;
    delete process.env.JIRA_API_TOKEN;
    await expect(readJiraVersions("https://x", "ACME")).rejects.toThrow(/JIRA_EMAIL/);
    if (saved[0]) process.env.JIRA_EMAIL = saved[0];
    if (saved[1]) process.env.JIRA_API_TOKEN = saved[1];
  });
});

const text = (value: string) => [{ plain_text: value }];
const pages: NotionPage[] = [
  {
    id: "p1",
    url: "https://notion.so/p1",
    properties: {
      Name: { type: "title", title: text("Dark mode") },
      Version: { type: "rich_text", rich_text: text("2.4.0") },
      Type: { type: "select", select: { name: "Feature" } },
      Date: { type: "date", date: { start: "2026-10-02" } },
      Published: { type: "checkbox", checkbox: true },
    },
  },
  {
    id: "p2",
    properties: {
      Name: { type: "title", title: text("Rounding") },
      Version: { type: "rich_text", rich_text: text("2.4.0") },
      Type: { type: "select", select: { name: "Bug" } },
      Published: { type: "checkbox", checkbox: true },
      Audience: { type: "multi_select", multi_select: [{ name: "Pro" }] },
    },
  },
  {
    id: "p3",
    properties: {
      Name: { type: "title", title: text("Draft") },
      Version: { type: "rich_text", rich_text: text("2.5.0") },
      Published: { type: "checkbox", checkbox: false },
    },
  },
  { id: "p4", properties: { Name: { type: "title", title: text("No version") } } },
];

describe("Notion", () => {
  it("groups pages by version and honours the publish flag", () => {
    const releases = parseNotionPages(pages, { properties: { published: "Published" } });
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({ id: "2.4.0", version: "2.4.0", date: "2026-10-02" });
    expect(releases[0]?.entries.map((e) => [e.text, e.type, e.audience])).toEqual([
      ["Dark mode", "feature", undefined],
      ["Rounding", "fix", ["pro"]],
    ]);
  });

  it("works with custom property names and without a publish flag", () => {
    const renamed = [
      {
        id: "x",
        properties: {
          Titel: { type: "title", title: text("Neu") },
          Release: { type: "select", select: { name: "Q4" } },
        },
      },
    ];
    const r = parseNotionPages(renamed, { properties: { title: "Titel", version: "Release" } });
    expect(r).toEqual([
      { id: "Q4", title: "Q4", entries: [{ type: "improvement", text: "Neu", id: "x" }] },
    ]);
  });

  it("pages through the query", async () => {
    let n = 0;
    const fetchMock = vi.fn(async () =>
      Response.json(
        ++n === 1
          ? { results: [pages[0]], has_more: true, next_cursor: "c2" }
          : { results: [pages[1]], has_more: false },
      ),
    ) as unknown as typeof fetch;
    const got = await readNotionPages("0123456789abcdef0123456789abcdef", {
      token: "secret",
      fetch: fetchMock,
    });
    expect(got).toHaveLength(2);
    const calls = (fetchMock as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls;
    expect(calls[0]?.[0]).toBe(
      "https://api.notion.com/v1/databases/0123456789abcdef0123456789abcdef/query",
    );
    expect(JSON.parse(String(calls[1]?.[1]?.body))).toMatchObject({ start_cursor: "c2" });
    expect((calls[0]?.[1]?.headers as Record<string, string> | undefined)?.["notion-version"]).toBe(
      "2022-06-28",
    );
  });

  it("rejects ids that are not database ids", async () => {
    await expect(readNotionPages("../../users", { token: "t" })).rejects.toThrow(/database id/);
  });
});
