import dotenv from 'dotenv';
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
   * Queries the HuggingFace Inference API for CLIP embeddings.
   * Handles model cold-start (503) with automatic retry and backoff.
   */
  private async queryHuggingFace(
    body: string | Buffer,
    contentType: string,
    retries = 4
  ): Promise<number[]> {
    if (!HF_TOKEN) {
      throw new Error('HUGGINGFACE_TOKEN environment variable is not set.');
    }

    for (let attempt = 0; attempt < retries; attempt++) {
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': contentType,
        },
        body,
      });

      if (response.status === 503) {
        // Model is cold-starting on HuggingFace servers — wait and retry
        const data = (await response.json()) as any;
        const waitMs = Math.min((data.estimated_time || 20) * 1000, 30000);
        console.log(`[HuggingFace] Model loading... retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HuggingFace API error ${response.status}: ${errText}`);
      }

      // HuggingFace returns [[...512 floats...]] for CLIP feature extraction
      const result = (await response.json()) as number[][];
      const embedding = Array.isArray(result[0]) ? result[0] : (result as unknown as number[]);
      return normalizeVector(embedding);
    }

    throw new Error('HuggingFace CLIP API failed after maximum retries. The model may still be loading — please try again in 30 seconds.');
  }

  /**
   * Generates a normalized CLIP text embedding via HuggingFace Inference API.
   * Compatible with existing pgvector stored embeddings (same model weights).
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    console.log(`[Embedding] Generating text embedding for: "${text.substring(0, 60)}..."`);
    return this.queryHuggingFace(
      JSON.stringify({ inputs: text }),
      'application/json'
    );
  }

  /**
   * Generates a normalized CLIP image embedding via HuggingFace Inference API.
   * Accepts raw image buffer from multer upload.
   */
  async getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
    console.log(`[Embedding] Generating image embedding for buffer of ${imageBuffer.length} bytes`);
    return this.queryHuggingFace(imageBuffer, 'image/jpeg');
  }
}

export const embeddingService = new EmbeddingService();