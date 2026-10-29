/** A notebook of the demo account with its snapshot (null for notebooks visitors created). */
export interface DemoNotebook {
  id: string;
  demoSnapshotAt: Date | null;
}

/** Filter shared by sources, chat messages and studio outputs (all have both columns). */
export interface AddedContentFilter {
  OR: Array<{ notebookId: string | { in: string[] }; createdAt?: { gt: Date } }>;
}

export interface DemoResetScope {
  /** Notebooks visitors created: deleted completely. */
  notebookIds: string[];
  /** Everything added after the snapshots, plus all content of the deleted notebooks. */
  addedContent: AddedContentFilter;
}

/**
 * What the nightly reset removes (ADR-025): notebooks without a snapshot entirely, and in
 * snapshot notebooks everything created after the snapshot.
 */
export function demoResetScope(notebooks: DemoNotebook[]): DemoResetScope {
  const notebookIds = notebooks.filter((n) => n.demoSnapshotAt === null).map((n) => n.id);
  const OR: AddedContentFilter['OR'] = notebooks.flatMap((n) =>
    n.demoSnapshotAt === null ? [] : [{ notebookId: n.id, createdAt: { gt: n.demoSnapshotAt } }],
  );
  if (notebookIds.length > 0) OR.unshift({ notebookId: { in: notebookIds } });
  return { notebookIds, addedContent: { OR } };
}
