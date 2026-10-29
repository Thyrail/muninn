import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Notebook, PrismaClient, Source } from '@muninn/db';

/**
 * Loads a notebook only if it belongs to the user. Foreign and unknown IDs both yield 404,
 * so the API never reveals whether someone else's notebook exists.
 */
export async function findOwnedNotebook(
  prisma: PrismaClient,
  userId: string,
  notebookId: string,
): Promise<Notebook> {
  const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
  if (!notebook) throw new NotFoundException('Notebook nicht gefunden.');
  return notebook;
}

/** A source together with its notebook's demo snapshot, for protection checks. */
export type OwnedSource = Source & { notebook: { demoSnapshotAt: Date | null } };

export async function findOwnedSource(
  prisma: PrismaClient,
  userId: string,
  sourceId: string,
): Promise<OwnedSource> {
  const source = await prisma.source.findFirst({
    where: { id: sourceId, notebook: { userId } },
    include: { notebook: { select: { demoSnapshotAt: true } } },
  });
  if (!source) throw new NotFoundException('Quelle nicht gefunden.');
  return source;
}

/**
 * The curated demo notebook and everything it contained at its snapshot stay intact for every
 * visitor of the shared demo account (ADR-025). Later additions are the visitor's own.
 */
export function isDemoProtected(demoSnapshotAt: Date | null, createdAt: Date): boolean {
  return demoSnapshotAt !== null && createdAt.getTime() <= demoSnapshotAt.getTime();
}

export function assertNotDemoProtected(demoSnapshotAt: Date | null, createdAt: Date): void {
  if (isDemoProtected(demoSnapshotAt, createdAt)) {
    throw new ForbiddenException(
      'Das gehört zur Demo und bleibt erhalten. Eigene Inhalte kannst du jederzeit löschen.',
    );
  }
}
