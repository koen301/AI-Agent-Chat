import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),

  llm: {
    apiKey: process.env.OPENAI_API_KEY!,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
  },

  embedding: {
    apiKey: process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY!,
    baseURL: process.env.EMBEDDING_BASE_URL || 'https://api.openai.com/v1',
    model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  },
};

if (!config.llm.apiKey) {
  throw new Error('请配置 OPENAI_API_KEY');
}
