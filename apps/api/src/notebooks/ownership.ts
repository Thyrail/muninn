import { NotFoundException } from '@nestjs/common';
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

export async function findOwnedSource(
  prisma: PrismaClient,
  userId: string,
  sourceId: string,
): Promise<Source> {
  const source = await prisma.source.findFirst({ where: { id: sourceId, notebook: { userId } } });
  if (!source) throw new NotFoundException('Quelle nicht gefunden.');
  return source;
}
