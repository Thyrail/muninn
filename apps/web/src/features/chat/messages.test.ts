import { describe, expect, it } from 'vitest';
import { chatErrorText, messageCitations, messageText, toUIMessage } from './messages';

const citation = {
  n: 1,
  chunkId: 'c1',
  sourceId: 's1',
  sourceTitle: 'Raben',
  page: 2,
  charStart: 0,
  charEnd: 10,
  excerpt: 'Hugin',
};

describe('toUIMessage', () => {
  it('keeps text and citations of assistant messages', () => {
    const message = toUIMessage({
      id: 'm1',
      role: 'ASSISTANT',
      content: 'Der Gedanke [1].',
      citations: [citation],
      createdAt: '2026-10-28T12:00:00.000Z',
    });
    expect(message.role).toBe('assistant');
    expect(messageText(message)).toBe('Der Gedanke [1].');
    expect(messageCitations(message)).toEqual([citation]);
  });

  it('maps user messages without citations', () => {
    const message = toUIMessage({
      id: 'm2',
      role: 'USER',
      content: 'Wer ist Hugin?',
      citations: [],
      createdAt: '2026-10-28T12:00:00.000Z',
    });
    expect(message.role).toBe('user');
    expect(messageCitations(message)).toEqual([]);
  });
});

describe('chatErrorText', () => {
  it('reads the message of a JSON error body', () => {
    const body = JSON.stringify({ statusCode: 429, message: 'Limit erreicht.' });
    expect(chatErrorText(new Error(body))).toBe('Limit erreicht.');
  });

  it('strips the field prefix of validation messages', () => {
    const body = JSON.stringify({ message: ['text: Bitte gib eine Frage ein.'] });
    expect(chatErrorText(new Error(body))).toBe('Bitte gib eine Frage ein.');
  });

  it('passes stream error texts through and falls back for HTML', () => {
    expect(chatErrorText(new Error('Antwort fehlgeschlagen.'))).toBe('Antwort fehlgeschlagen.');
    expect(chatErrorText(new Error('<html>502</html>'))).toMatch(/konnte nicht erstellt/);
  });
});
