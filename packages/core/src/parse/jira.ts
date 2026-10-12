import type { Release } from "../types";
import { issuesRelease, type TrackerOptions } from "./tracker";

/** A Jira project version (`GET /rest/api/3/project/{key}/versions`). */
export interface JiraVersion {
  name: string;
  description?: string | null;
  released?: boolean;
  releaseDate?: string | null;
}

/** An issue of `GET /rest/api/3/search/jql` with the fields `summary`, `issuetype` and `labels`. */
export interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    issuetype?: { name?: string } | null;
    labels?: string[];
  };
}

export interface ParseJiraOptions extends TrackerOptions {
  /** Base URL of the Jira site, used for issue links, e.g. `https://acme.atlassian.net`. */
  baseUrl?: string;
  /** Include versions that are not released yet. Default `false`. */
  includeUnreleased?: boolean;
}

/**
 * Turns Jira versions (the release's issues are those with that `fixVersion`) into releases.
 * The issue type and labels decide the entry type; `audience:pro` sets an audience.
 *
 * @beta Checked against fixtures of the documented API shape, not yet against a live site.
 */
export function parseJiraVersions(
  versions: { version: JiraVersion; issues: JiraIssue[] }[],
  options: ParseJiraOptions = {},
): Release[] {
  const base = options.baseUrl?.replace(/\/$/, "");
  return versions.flatMap(({ version, issues }) => {
    if (!options.includeUnreleased && !version.released) return [];
    const semver = /^v?(\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?)$/.exec(version.name.trim())?.[1];
    const release = issuesRelease(
      {
        id: semver ?? version.name.trim(),
        ...(semver ? { version: semver } : { title: version.name.trim() }),
        ...(version.releaseDate ? { date: version.releaseDate } : {}),
        ...(version.description?.trim() ? { summary: version.description.trim() } : {}),
      },
      issues.map((issue) => ({
        key: issue.key,
        title: issue.fields.summary,
        url: base ? `${base}/browse/${issue.key}` : undefined,
        kind: issue.fields.issuetype?.name,
        labels: issue.fields.labels,
      })),
      options,
    );
    return release ? [release] : [];
  });
}
