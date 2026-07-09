import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_API_URL = 'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32';

/**
 * Normalizes a vector to unit length (L2 norm = 1).
 * Required to match the normalized embeddings already stored in Supabase pgvector.
 */
function normalizeVector(embedding: number[]): number[] {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding;
  return embedding.map((val) => val / magnitude);
}

class EmbeddingService {
  /**
   * Queries the HuggingFace Inference API for CLIP embeddings using axios.
   * Handles model cold-start (503) with automatic retry and backoff.
   */
  private async queryHuggingFace(
    data: object | Buffer,
    contentType: string,
    retries = 4
  ): Promise<number[]> {
    if (!HF_TOKEN) {
      throw new Error('HUGGINGFACE_TOKEN environment variable is not set. Add it in Render dashboard.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await axios.post(HF_API_URL, data, {
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            'Content-Type': contentType,
          },
          timeout: 60000, // 60s — HuggingFace free tier can be slow on cold start
          responseType: 'json',
        });

        if (response.status === 503) {
          // Model is cold-starting on HuggingFace servers
          const waitMs = Math.min(((response.data as any).estimated_time || 20) * 1000, 30000);
          console.log(`[HuggingFace] Model loading... retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        // HuggingFace returns [[...512 floats...]] for CLIP feature extraction
        const result = response.data as number[][];
        const embedding = Array.isArray(result[0]) ? result[0] : (result as unknown as number[]);
        return normalizeVector(embedding);

      } catch (err: any) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          const body = err.response?.data;

          // 503 = model loading, retry
          if (status === 503) {
            const waitMs = Math.min(((body as any)?.estimated_time || 20) * 1000, 30000);
            console.log(`[HuggingFace] 503 Model loading... retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
            await new Promise((resolve) => setTimeout(resolve, waitMs));
            continue;
          }

          // Log full details for debugging
          console.error(`[HuggingFace] Axios error on attempt ${attempt + 1}:`, {
            status,
            statusText: err.response?.statusText,
            body,
            message: err.message,
            code: err.code,
          });
        } else {
          console.error(`[HuggingFace] Non-axios error on attempt ${attempt + 1}:`, err);
        }

        // On last attempt, throw
        if (attempt === retries - 1) throw err;

        // Wait 2s before next retry on other errors
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    throw new Error('HuggingFace CLIP API failed after maximum retries.');
  }

  /**
   * Generates a normalized CLIP text embedding via HuggingFace Inference API.
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    console.log(`[Embedding] Generating text embedding for: "${text.substring(0, 60)}"`);
    return this.queryHuggingFace({ inputs: text }, 'application/json');
  }

  /**
   * Generates a normalized CLIP image embedding via HuggingFace Inference API.
   */
  async getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
    console.log(`[Embedding] Generating image embedding (${imageBuffer.length} bytes)`);
    return this.queryHuggingFace(imageBuffer, 'image/jpeg');
  }
}

export const embeddingService = new EmbeddingService();