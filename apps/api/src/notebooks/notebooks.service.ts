import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Notebook, PrismaClient } from '@muninn/db';
import {
  DEFAULT_NOTEBOOK_TITLE,
  LIMITS,
  type CreateNotebookInput,
  type NotebookSummary,
  type RenameNotebookInput,
} from '@muninn/shared';
import { PRISMA } from '../prisma/prisma.module.js';
import { StorageService } from '../storage/storage.service.js';
import { assertNotDemoProtected, findOwnedNotebook, isDemoProtected } from './ownership.js';

type NotebookWithCount = Notebook & { _count: { sources: number } };

function toSummary(notebook: NotebookWithCount): NotebookSummary {
  return {
    id: notebook.id,
    title: notebook.title,
    sourceCount: notebook._count.sources,
    protected: isDemoProtected(notebook.demoSnapshotAt, notebook.createdAt),
    createdAt: notebook.createdAt.toISOString(),
    updatedAt: notebook.updatedAt.toISOString(),
  };
}

const withSourceCount = { _count: { select: { sources: true } } } as const;

@Injectable()
export class NotebooksService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly storage: StorageService,
  ) {}

  async list(userId: string): Promise<NotebookSummary[]> {
    const notebooks = await this.prisma.notebook.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: withSourceCount,
    });
    return notebooks.map(toSummary);
  }

  async get(userId: string, notebookId: string): Promise<NotebookSummary> {
    await findOwnedNotebook(this.prisma, userId, notebookId);
    return this.getSummary(notebookId);
  }

  async create(userId: string, input: CreateNotebookInput): Promise<NotebookSummary> {
    const count = await this.prisma.notebook.count({ where: { userId } });
    if (count >= LIMITS.maxNotebooksPerUser) {
      throw new ConflictException(
        `Du kannst höchstens ${LIMITS.maxNotebooksPerUser} Notebooks anlegen. Lösche ein altes, um ein neues zu erstellen.`,
      );
    }
    const notebook = await this.prisma.notebook.create({
      data: { userId, title: input.title ?? DEFAULT_NOTEBOOK_TITLE },
      include: withSourceCount,
    });
    return toSummary(notebook);
  }

  async rename(
    userId: string,
    notebookId: string,
    input: RenameNotebookInput,
  ): Promise<NotebookSummary> {
    const owned = await findOwnedNotebook(this.prisma, userId, notebookId);
    assertNotDemoProtected(owned.demoSnapshotAt, owned.createdAt);
    const notebook = await this.prisma.notebook.update({
      where: { id: notebookId },
      data: { title: input.title },
      include: withSourceCount,
    });
    return toSummary(notebook);
  }

  /** Deletes the notebook (sources, chunks, chat and studio outputs cascade) and its files. */
  async remove(userId: string, notebookId: string): Promise<void> {
    const notebook = await findOwnedNotebook(this.prisma, userId, notebookId);
    assertNotDemoProtected(notebook.demoSnapshotAt, notebook.createdAt);
    const [sources, outputs] = await Promise.all([
      this.prisma.source.findMany({
        where: { notebookId, storageKey: { not: null } },
        select: { storageKey: true },
      }),
      this.prisma.studioOutput.findMany({
        where: { notebookId, audioStorageKey: { not: null } },
        select: { audioStorageKey: true },
      }),
    ]);
    await this.prisma.notebook.delete({ where: { id: notebookId } });
    const keys = [
      ...sources.map((source) => source.storageKey),
      ...outputs.map((output) => output.audioStorageKey),
    ].filter((key): key is string => key !== null);
    await this.storage.deleteMany(keys);
  }

  private async getSummary(notebookId: string): Promise<NotebookSummary> {
    const notebook = await this.prisma.notebook.findUniqueOrThrow({
      where: { id: notebookId },
      include: withSourceCount,
    });
    return toSummary(notebook);
  }
}
