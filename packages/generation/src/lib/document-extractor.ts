import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import type { RequirementDocumentMediaType } from '@aj-mock-hub/contracts';

export const MAX_EXTRACTED_TEXT_CHARACTERS = 200_000;

export class DocumentExtractor {
  async extract(
    mediaType: RequirementDocumentMediaType,
    content: Buffer,
  ): Promise<string> {
    let text: string;
    if (mediaType === 'text/plain' || mediaType === 'text/markdown') {
      text = new TextDecoder('utf-8', { fatal: true }).decode(content);
    } else if (mediaType === 'application/pdf') {
      text = await this.extractPdf(content);
    } else {
      const result = await mammoth.extractRawText({ buffer: content });
      text = result.value;
    }
    return this.normalizeAndBound(text);
  }

  private async extractPdf(content: Buffer): Promise<string> {
    const parser = new PDFParse({ data: new Uint8Array(content) });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }

  private normalizeAndBound(text: string): string {
    const normalized = text.replace(/\0/g, '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) {
      throw new Error('Document contains no extractable text');
    }
    if (normalized.length > MAX_EXTRACTED_TEXT_CHARACTERS) {
      throw new Error('Extracted document text exceeds the configured limit');
    }
    return normalized;
  }
}
