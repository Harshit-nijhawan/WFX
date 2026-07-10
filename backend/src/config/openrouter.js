import dotenv from 'dotenv';

dotenv.config();

const openrouterApiKey = process.env.OPENROUTER_API_KEY;

export const openrouterConfig = {
  apiKey: openrouterApiKey || '',
  apiUrl: 'https://openrouter.ai/api/v1/chat/completions',
  model: 'meta-llama/llama-3.1-70b-instruct'
};
