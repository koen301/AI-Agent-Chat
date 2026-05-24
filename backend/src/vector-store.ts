import OpenAI from 'openai';
import { config } from './config.js';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
  };
  embedding: number[];
}

/**
 * 简单内存向量存储
 * 生产环境应替换为 Chroma / Pinecone / Qdrant
 */
class VectorStore {
  private documents: DocumentChunk[] = [];
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.embedding.apiKey,
      baseURL: config.embedding.baseURL,
    });
  }

  /**
   * 文本转向量（Embedding）
   */
  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: config.embedding.model,
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }

  /**
   * 添加文档片段到向量库
   */
  async addChunks(chunks: { content: string; metadata: DocumentChunk['metadata'] }[]) {
    const embeddings = await this.embed(chunks.map(c => c.content));

    const docs: DocumentChunk[] = chunks.map((chunk, i) => ({
      id: `${chunk.metadata.source}-${Date.now()}-${i}`,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[i],
    }));

    this.documents.push(...docs);
    console.log(`[VectorStore] 已存储 ${docs.length} 个片段，总计 ${this.documents.length}`);
  }

  /**
   * 余弦相似度检索 Top-K
   */
  async search(query: string, topK: number = 4): Promise<DocumentChunk[]> {
    if (this.documents.length === 0) return [];

    const [queryEmbedding] = await this.embed([query]);

    // 计算余弦相似度
    const scored = this.documents.map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.doc);
  }

  clear() {
    this.documents = [];
  }

  get count() {
    return this.documents.length;
  }
}

/**
 * 余弦相似度计算
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const vectorStore = new VectorStore();
