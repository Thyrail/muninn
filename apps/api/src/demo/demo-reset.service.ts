import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@muninn/db';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { API_ENV, type ApiEnv } from '../config/env.js';
import { PRISMA } from '../prisma/prisma.module.js';
import { StorageService } from '../storage/storage.service.js';
import { demoResetScope } from './reset-scope.js';

const CREDENTIAL_PROVIDER = 'credential';

export interface DemoResetResult {
  notebooks: number;
  sources: number;
  messages: number;
  outputs: number;
  files: number;
  passwordRestored: boolean;
}

/**
 * Returns the shared demo account to its curated state (ADR-025): removes what visitors added
 * since the snapshot, their files in S3, and restores the configured password.
 */
@Injectable()
export class DemoResetService {
  private readonly logger = new Logger(DemoResetService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(API_ENV) private readonly env: ApiEnv,
    private readonly storage: StorageService,
  ) {}

  async reset(): Promise<DemoResetResult | null> {
    const email = this.env.DEMO_USER_EMAIL?.toLowerCase();
    if (!email) return null;
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) {
      this.logger.warn('Demo reset skipped: demo user does not exist');
      return null;
    }

    const notebooks = await this.prisma.notebook.findMany({
      where: { userId: user.id },
      select: { id: true, demoSnapshotAt: true },
    });
    const { notebookIds, addedContent } = demoResetScope(notebooks);

    let removed = { notebooks: 0, sources: 0, messages: 0, outputs: 0, files: 0 };
    if (addedContent.OR.length > 0) {
      const [sourceKeys, audioKeys] = await Promise.all([
        this.prisma.source.findMany({
          where: { ...addedContent, storageKey: { not: null } },
          select: { storageKey: true },
        }),
        this.prisma.studioOutput.findMany({
          where: { ...addedContent, audioStorageKey: { not: null } },
          select: { audioStorageKey: true },
        }),
      ]);
      // Chunks cascade from their sources; the notebooks go last, once they are empty.
      const [sources, messages, outputs, deletedNotebooks] = await this.prisma.$transaction([
        this.prisma.source.deleteMany({ where: addedContent }),
        this.prisma.chatMessage.deleteMany({ where: addedContent }),
        this.prisma.studioOutput.deleteMany({ where: addedContent }),
        this.prisma.notebook.deleteMany({ where: { id: { in: notebookIds } } }),
      ]);
      const keys = [
        ...sourceKeys.map((source) => source.storageKey),
        ...audioKeys.map((output) => output.audioStorageKey),
      ].filter((key): key is string => key !== null);
      await this.storage.deleteMany(keys);
      removed = {
        notebooks: deletedNotebooks.count,
        sources: sources.count,
        messages: messages.count,
        outputs: outputs.count,
        files: keys.length,
      };
    }

    const result = { ...removed, passwordRestored: await this.restorePassword(user.id) };
    this.logger.log({ ...result }, 'Demo account reset');
    return result;
  }

  /** Account changes are blocked for the demo user; this is the safety net if one slips through. */
  private async restorePassword(userId: string): Promise<boolean> {
    const password = this.env.DEMO_USER_PASSWORD;
    if (!password) return false;
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: CREDENTIAL_PROVIDER },
      select: { id: true, password: true },
    });
    if (!account) return false;
    // A malformed hash throws; treat it like a wrong password and overwrite it.
    const intact = await verifyPassword({ hash: account.password ?? '', password }).catch(
      () => false,
    );
    if (intact) return false;
    await this.prisma.account.update({
      where: { id: account.id },
      data: { password: await hashPassword(password) },
    });
    return true;
  }
}
