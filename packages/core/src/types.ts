/** Kind of change. Drives the label and colour in the widget. */
export type EntryType =
  | "feature"
  | "improvement"
  | "fix"
  | "breaking"
  | "security"
  | "deprecated"
  | "removed"
  | "other";

export const ENTRY_TYPES: readonly EntryType[] = [
  "breaking",
  "security",
  "feature",
  "improvement",
  "fix",
  "deprecated",
  "removed",
  "other",
];

export interface Entry {
  type: EntryType;
  /** One line, inline Markdown (bold, italic, code, links). */
  text: string;
  /** Further paragraphs, inline Markdown, separated by blank lines. */
  details?: string;
  /** Conventional-commit scope, e.g. `billing`. */
  scope?: string;
  /** Link to a pull request, issue or commit. */
  link?: string;
}

export interface Release {
  /** Stable id, used to remember what a reader has seen. Usually the version. */
  id: string;
  version?: string;
  /** ISO 8601 date or date-time. */
  date?: string;
  /** Package name in monorepos, e.g. `@acme/app`. */
  package?: string;
  /** Optional headline written by a person, e.g. "Dark mode is here". */
  title?: string;
  /** Optional short paragraph above the entries, inline Markdown. */
  summary?: string;
  /** Optional image URL shown above the entries. */
  image?: string;
  entries: Entry[];
}

/** The `changelog.json` file the widget reads. */
export interface Feed {
  /** Format version of this file. */
  version: 1;
  title?: string;
  /** Page with the full changelog. */
  link?: string;
  generatedAt?: string;
  /** Newest first. */
  releases: Release[];
}

/** Human-written additions keyed by release id, merged into generated releases. */
export type Highlights = Record<string, Partial<Pick<Release, "title" | "summary" | "image">>>;
