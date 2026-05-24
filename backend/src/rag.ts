import pdfParse from 'pdf-parse';
import { vectorStore, type DocumentChunk } from './vector-store.js';

/**
 * 文本分割器
 * 按段落、句子、字符优先级递归分割
 */
export function splitText(text: string, chunkSize = 500, overlap = 50): string[] {
  const separators = ['\n\n', '\n', '。', '；', '. ', '; ', ' ', ''];
  const chunks: string[] = [];

  function split(text: string, sepIndex: number): string[] {
    if (text.length <= chunkSize) return [text];
    if (sepIndex >= separators.length) {
      // 兜底：硬切
      const result: string[] = [];
      let start = 0;
      while (start < text.length) {
        result.push(text.slice(start, start + chunkSize));
        start += chunkSize - overlap;
      }
      return result;
    }

    const sep = separators[sepIndex];
    const parts = sep ? text.split(sep) : text.split('');

    const result: string[] = [];
    let current = '';

    for (const part of parts) {
      const candidate = current + (current && sep ? sep : '') + part;
      if (candidate.length <= chunkSize) {
        current = candidate;
      } else {
        if (current) result.push(current);
        current = part;
      }
    }
    if (current) result.push(current);

    // 如果有超长片段，用下一级分隔符再分
    const final: string[] = [];
    for (const r of result) {
      if (r.length > chunkSize) {
        final.push(...split(r, sepIndex + 1));
      } else {
        final.push(r);
      }
    }
    return final;
  }

  return split(text, 0).filter(c => c.trim().length > 20);
}

/**
 * 处理 PDF 文件：提取文本 → 分割 → 向量化 → 存储
 */
export async function processPDF(buffer: Buffer, filename: string) {
  const parsed = await pdfParse(buffer);
  const text = parsed.text;

  const chunks = splitText(text, 500, 50);

  await vectorStore.addChunks(
    chunks.map((content, i) => ({
      content,
      metadata: { source: filename, page: Math.floor(i / 3) + 1 },
    }))
  );

  return { chunks: chunks.length, totalChars: text.length };
}

/**
 * 处理 TXT / MD 文件
 */
export async function processText(text: string, filename: string) {
  const chunks = splitText(text, 500, 50);

  await vectorStore.addChunks(
    chunks.map(content => ({
      content,
      metadata: { source: filename },
    }))
  );

  return { chunks: chunks.length, totalChars: text.length };
}

/**
 * 检索相关文档片段
 */
export async function retrieveContext(query: string): Promise<{ context: string; sources: DocumentChunk[] }> {
  const docs = await vectorStore.search(query, 4);
  const context = docs.map((d, i) => `[${i + 1}] ${d.content}`).join('\n\n');
  return { context, sources: docs };
}
