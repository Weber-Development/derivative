import type { Release } from "../types";
import { issuesRelease, type TrackerOptions } from "./tracker";

/** The fields Derivative reads from Linear's GraphQL `cycles` query (see `LINEAR_CYCLES_QUERY`). */
export interface LinearCycle {
  number: number;
  name?: string | null;
  completedAt?: string | null;
  issues: {
    nodes: {
      identifier: string;
      title: string;
      url?: string;
      labels?: { nodes: { name: string }[] };
    }[];
  };
}

/** The query `readLinearCycles` sends: completed cycles of one team with their completed issues. */
export const LINEAR_CYCLES_QUERY = `query Cycles($team: String!, $first: Int!) {
  cycles(first: $first, filter: { team: { key: { eq: $team } }, completedAt: { null: false } }) {
    nodes {
      number
      name
      completedAt
      issues(first: 100, filter: { completedAt: { null: false } }) {
        nodes { identifier title url labels { nodes { name } } }
      }
    }
  }
}`;

/**
 * Turns completed Linear cycles into releases (one per cycle). Labels decide the entry type
 * (`Bug`, `Feature`, `Improvement`, ...); `audience:pro` sets an audience; `internal` hides an issue.
 *
 * @beta Checked against fixtures of the documented API shape, not yet against a live workspace.
 */
export function parseLinearCycles(cycles: LinearCycle[], options: TrackerOptions = {}): Release[] {
  return cycles.flatMap((cycle) => {
    const release = issuesRelease(
      {
        id: `cycle-${cycle.number}`,
        ...(cycle.name ? { title: cycle.name } : {}),
        ...(cycle.completedAt ? { date: cycle.completedAt } : {}),
      },
      cycle.issues.nodes.map((issue) => ({
        key: issue.identifier,
        title: issue.title,
        url: issue.url,
        labels: issue.labels?.nodes.map((l) => l.name),
      })),
      options,
    );
    return release ? [release] : [];
  });
}
