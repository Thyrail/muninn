import { describe, expect, it } from 'vitest';
import { demoResetScope } from './reset-scope.js';

const snapshot = new Date('2026-10-29T18:00:00Z');

describe('demoResetScope', () => {
  it('deletes visitor notebooks and trims snapshot notebooks', () => {
    const scope = demoResetScope([
      { id: 'demo', demoSnapshotAt: snapshot },
      { id: 'visitor-a', demoSnapshotAt: null },
      { id: 'visitor-b', demoSnapshotAt: null },
    ]);
    expect(scope.notebookIds).toEqual(['visitor-a', 'visitor-b']);
    expect(scope.addedContent.OR).toEqual([
      { notebookId: { in: ['visitor-a', 'visitor-b'] } },
      { notebookId: 'demo', createdAt: { gt: snapshot } },
    ]);
  });

  it('matches nothing without notebooks', () => {
    expect(demoResetScope([])).toEqual({ notebookIds: [], addedContent: { OR: [] } });
  });
});
