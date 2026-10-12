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
  /** Stable id of the entry, e.g. the ticket key. Used by translations. */
  id?: string;
  /** Audiences that see the entry (matched against the widget's `audience`). Empty: everyone. */
  audience?: string[];
  /** CSS selector of the page element this entry is about. The widget marks it with `data-derivative-hint` while the entry is unread (needs the `hints` attribute). */
  target?: string;
}

/** An image or video shown with a release. */
export interface Media {
  type: "image" | "video";
  url: string;
  /** Text alternative for images. Empty for decorative images. */
  alt?: string;
}

/** A call to action under a release, e.g. "Read the guide". */
export interface ReleaseLink {
  label: string;
  url: string;
}

/** A translation of the texts of one release, keyed by language in `Release.translations`. */
export interface ReleaseTranslation {
  title?: string;
  summary?: string;
  /** Translated `text` per entry, keyed by `Entry.id`. */
  entries?: Record<string, string>;
}

/** How loudly the widget announces a release. `major` is preferred for the highlight. */
export type Importance = "normal" | "major";

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
  /** Images and videos shown above the entries. */
  media?: Media[];
  /** Links shown under the entries. */
  links?: ReleaseLink[];
  /** `major` releases are announced first by the widget's `highlight` attribute. */
  importance?: Importance;
  /** Audiences that see the release. Empty: everyone. */
  audience?: string[];
  /** Translations of the title, summary and entries, keyed by language code (`de`, `fr`, ...). */
  translations?: Record<string, ReleaseTranslation>;
  entries: Entry[];
}

/** The `changelog.json` file the widget reads. */
export interface Feed {
  /** Format version of this file. */
  version: 2;
  title?: string;
  /** Page with the full changelog. */
  link?: string;
  generatedAt?: string;
  /** Newest first. */
  releases: Release[];
}

/** Human-written additions keyed by release id, merged into generated releases. */
export type Highlights = Record<
  string,
  Partial<Pick<Release, "title" | "summary" | "media" | "links" | "importance" | "audience">>
>;
