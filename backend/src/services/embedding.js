import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
// HuggingFace Inference Providers router for CLIP feature extraction
const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32';

/**
 * Normalizes a vector to unit length (L2 norm = 1).
 * Required to match the normalized embeddings already stored in Supabase pgvector.
 */
function normalizeVector(embedding) {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding;
  return embedding.map((val) => val / magnitude);
}

class EmbeddingService {
  /**
   * Queries the HuggingFace Inference API for CLIP embeddings.
   * Handles model cold-start (503) with automatic retry and backoff.
   * Uses ~5MB RAM — no local model loading.
   */
  async queryHuggingFace(data, contentType, retries = 4) {
    if (!HF_TOKEN) {
      throw new Error('HUGGINGFACE_TOKEN environment variable is not set.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.post(HF_API_URL, data, {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': contentType,
          },
          timeout: 60000,
          responseType: 'json',
        });

        // HuggingFace returns [[...512 floats...]] for CLIP feature extraction
        const result = response.data;
        const embedding = Array.isArray(result[0]) ? result[0] : result;
        return normalizeVector(embedding);

      } catch (err) {
        const status = err.response?.status;
        const body = err.response?.data;

        // 503 = model is cold-starting on HuggingFace servers, retry
        if (status === 503) {
          const waitMs = Math.min(((body?.estimated_time || 20) * 1000), 30000);
          console.log(`[HuggingFace] Model loading (503)... retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        console.error(`[HuggingFace] Error on attempt ${attempt + 1}:`, {
          status,
          body,
          message: err.message,
        });

        // Last attempt — throw
        if (attempt === retries - 1) throw err;

        // Wait 2s before next retry on other errors
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('HuggingFace CLIP API failed after maximum retries.');
  }

  /**
   * Generates a normalized CLIP text embedding via HuggingFace Inference API.
   * No local model — runs in ~5MB RAM.
   */
  async getTextEmbedding(text) {
    console.log(`[Embedding] Generating text embedding via HuggingFace API for: "${text.substring(0, 60)}"`);
    return this.queryHuggingFace({ inputs: text }, 'application/json');
  }

  /**
   * Generates a normalized CLIP image embedding via HuggingFace Inference API.
   * No local model — runs in ~5MB RAM.
   */
  async getImageEmbedding(imageBuffer) {
    console.log(`[Embedding] Generating image embedding via HuggingFace API (${imageBuffer.length} bytes)`);
    return this.queryHuggingFace(imageBuffer, 'image/jpeg');
  }
}

export const embeddingService = new EmbeddingService();
