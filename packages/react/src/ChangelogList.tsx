import { type Release, type RenderOptions, renderReleases } from "@sweberdev/derivative";

export interface ChangelogListProps extends RenderOptions {
  releases: Release[];
  className?: string;
}

/**
 * Renders releases as HTML with `dv-` class names, without any styles.
 * Text is escaped and only a small Markdown subset is rendered, so feed content cannot inject HTML.
 */
export function ChangelogList({ releases, className, ...options }: ChangelogListProps) {
  return (
    <div
      className={className}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: renderReleases escapes all feed text.
      dangerouslySetInnerHTML={{ __html: renderReleases(releases, options) }}
    />
  );
}
