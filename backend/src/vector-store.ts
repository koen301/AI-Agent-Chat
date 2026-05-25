import { ChromaClient, EmbeddingFunction } from 'chromadb';
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
 * ChromaDB 向量存储（连接本地服务）
 */
class VectorStore {
  private client: ChromaClient;
  private openai: OpenAI;
  private collectionName = 'knowledge_base';

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.embedding.apiKey,
      baseURL: config.embedding.baseURL,
    });

    this.client = new ChromaClient({ path: 'http://localhost:8000' });
  }

  private createEmbeddingFunction(): EmbeddingFunction {
    return {
      generate: async (texts: string[]) => {
        const response = await this.openai.embeddings.create({
          model: config.embedding.model,
          input: texts,
        });
        return response.data.map(d => d.embedding);
      },
    };
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
   * 获取或创建 collection
   */
  private async getCollection() {
    const embeddingFunction = this.createEmbeddingFunction();
    try {
      return await this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction,
      });
    } catch (e) {
      return await this.client.createCollection({
        name: this.collectionName,
        embeddingFunction,
      });
    }
  }

  /**
   * 添加文档片段到向量库
   */
  async addChunks(chunks: { content: string; metadata: DocumentChunk['metadata'] }[]) {
    const collection = await this.getCollection();

    const embeddings = await this.embed(chunks.map(c => c.content));

    const ids = chunks.map((chunk, i) => `${chunk.metadata.source}-${Date.now()}-${i}`);
    const documents = chunks.map(c => c.content);
    const metadatas = chunks.map(c => c.metadata);

    await collection.add({
      ids,
      embeddings,
      documents,
      metadatas,
    });

    console.log(`[VectorStore] 已存储 ${chunks.length} 个片段到 ChromaDB`);
  }

  /**
   * 余弦相似度检索 Top-K
   */
  async search(query: string, topK: number = 4): Promise<DocumentChunk[]> {
    const collection = await this.getCollection();

    const [queryEmbedding] = await this.embed([query]);

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });

    const docs = results.documents[0];
    const metas = results.metadatas[0];
    const ids = results.ids[0];

    if (!docs) return [];

    return docs.map((content, i) => ({
      id: ids[i],
      content: content || '',
      metadata: metas[i] as DocumentChunk['metadata'],
      embedding: [],
    }));
  }

  async clear() {
    try {
      await this.client.deleteCollection({ name: this.collectionName });
      console.log('[VectorStore] ChromaDB collection 已清空');
    } catch (e) {
      console.log('[VectorStore] 清空collection失败，可能不存在');
    }
  }

  async getCount() {
    try {
      const collection = await this.getCollection();
      return await collection.count();
    } catch (e) {
      return 0;
    }
  }
}

/*
================================================================================
                           以下是原自研内存向量库代码（已注释保留）
================================================================================

import OpenAI from 'openai';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
  };
  embedding: number[];
}

class VectorStore {
  private documents: DocumentChunk[] = [];
  private openai: OpenAI;
  private dataDir: string;
  private dataFile: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.embedding.apiKey,
      baseURL: config.embedding.baseURL,
    });

    this.dataDir = path.join(process.cwd(), 'vector_data');
    this.dataFile = path.join(this.dataDir, 'documents.json');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        this.documents = data || [];
        console.log(`[VectorStore] 从磁盘加载 ${this.documents.length} 个片段`);
      }
    } catch (e) {
      console.error('[VectorStore] 加载磁盘数据失败:', e);
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(this.documents, null, 2));
    } catch (e) {
      console.error('[VectorStore] 保存磁盘数据失败:', e);
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: config.embedding.model,
      input: texts,
    });
    return response.data.map(d => d.embedding);
  }

  async addChunks(chunks: { content: string; metadata: DocumentChunk['metadata'] }[]) {
    const embeddings = await this.embed(chunks.map(c => c.content));

    const docs: DocumentChunk[] = chunks.map((chunk, i) => ({
      id: `${chunk.metadata.source}-${Date.now()}-${i}`,
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[i],
    }));

    this.documents.push(...docs);
    this.saveToDisk();
    console.log(`[VectorStore] 已存储 ${docs.length} 个片段，总计 ${this.documents.length}`);
  }

  async search(query: string, topK: number = 4): Promise<DocumentChunk[]> {
    if (this.documents.length === 0) return [];

    const [queryEmbedding] = await this.embed([query]);

    const scored = this.documents.map(doc => ({
      doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map(s => s.doc);
  }

  clear() {
    this.documents = [];
    this.saveToDisk();
  }

  get count() {
    return this.documents.length;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

================================================================================
*/

export const vectorStore = new VectorStore();
