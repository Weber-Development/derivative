import type { Release } from "../types";
import { issuesRelease, type TrackerIssue, type TrackerOptions } from "./tracker";

/** A page of a Notion database query (`POST /v1/databases/{id}/query`). */
export interface NotionPage {
  id: string;
  url?: string;
  properties: Record<string, NotionProperty>;
}

export type NotionProperty = {
  type: string;
  title?: { plain_text: string }[];
  rich_text?: { plain_text: string }[];
  select?: { name: string } | null;
  status?: { name: string } | null;
  multi_select?: { name: string }[];
  date?: { start: string } | null;
  checkbox?: boolean;
  number?: number | null;
};

export interface ParseNotionOptions extends TrackerOptions {
  /** Property names. Defaults: `Name`, `Version`, `Type`, `Date`, `Audience`; no publish flag. */
  properties?: {
    title?: string;
    version?: string;
    type?: string;
    date?: string;
    audience?: string;
    /** Checkbox: only checked pages are published. */
    published?: string;
  };
}

/**
 * Turns the pages of a Notion database into releases, grouped by the `Version` property. A page is
 * one entry: its title is the text, `Type` the entry type, `Date` the release date.
 *
 * @beta Checked against fixtures of the documented API shape, not yet against a live workspace.
 */
export function parseNotionPages(pages: NotionPage[], options: ParseNotionOptions = {}): Release[] {
  const names = {
    title: "Name",
    version: "Version",
    type: "Type",
    date: "Date",
    ...options.properties,
  };
  const audienceName = options.properties?.audience ?? "Audience";
  const groups = new Map<string, { date?: string; issues: TrackerIssue[] }>();
  for (const page of pages) {
    const p = page.properties;
    if (names.published !== undefined && p[names.published]?.checkbox !== true) continue;
    const version = text(p[names.version]);
    const title = text(p[names.title]);
    if (!version || !title) continue;
    const group = groups.get(version) ?? { issues: [] };
    const date = p[names.date]?.date?.start;
    if (date && (!group.date || date > group.date)) group.date = date;
    group.issues.push({
      key: page.id,
      title,
      url: page.url,
      kind: text(p[names.type]),
      labels: (p[audienceName]?.multi_select ?? []).map((a) => `audience:${a.name}`),
    });
    groups.set(version, group);
  }
  return [...groups].flatMap(([version, group]) => {
    const semver = /^v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)$/.exec(version)?.[1];
    const release = issuesRelease(
      {
        id: semver ?? version,
        ...(semver ? { version: semver } : { title: version }),
        ...(group.date ? { date: group.date } : {}),
      },
      group.issues,
      options,
    );
    return release ? [release] : [];
  });
}

/** Plain text of a title, rich text, select or status property. */
function text(property: NotionProperty | undefined): string | undefined {
  if (!property) return undefined;
  const parts = property.title ?? property.rich_text;
  const value = parts
    ? parts.map((t) => t.plain_text).join("")
    : (property.select?.name ?? property.status?.name ?? undefined);
  const fallback =
    value ?? (typeof property.number === "number" ? String(property.number) : undefined);
  return fallback?.trim() || undefined;
}
