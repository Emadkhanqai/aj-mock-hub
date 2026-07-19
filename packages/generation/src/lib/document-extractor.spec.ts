import { DocumentExtractor } from './document-extractor';

describe('DocumentExtractor', () => {
  const extractor = new DocumentExtractor();

  it('normalizes plain text documents', async () => {
    await expect(
      extractor.extract('text/plain', Buffer.from('First\r\nSecond\0')),
    ).resolves.toBe('First\nSecond');
  });

  it('rejects empty documents', async () => {
    await expect(
      extractor.extract('text/markdown', Buffer.from('  ')),
    ).rejects.toThrow('no extractable text');
  });

  it('rejects invalid UTF-8 text', async () => {
    await expect(
      extractor.extract('text/plain', Buffer.from([0xff])),
    ).rejects.toThrow();
  });
});
