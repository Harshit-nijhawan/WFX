import { 
  AutoTokenizer, 
  AutoProcessor,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  RawImage 
} from '@xenova/transformers';

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
  tokenizer = null;
  processor = null;
  modelId = 'Xenova/clip-vit-base-patch32';

  async initializeTokenizer() {
    if (!this.tokenizer) {
      this.tokenizer = await AutoTokenizer.from_pretrained(this.modelId);
    }
  }

  async initializeProcessor() {
    if (!this.processor) {
      this.processor = await AutoProcessor.from_pretrained(this.modelId);
    }
  }

  /**
   * Generates a normalized CLIP text embedding locally.
   * Dynamically loads and disposes of the model to keep memory footprint under 512MB on Render.
   */
  async getTextEmbedding(text) {
    await this.initializeTokenizer();
    console.log(`[Embedding] Generating text embedding for: "${text.substring(0, 60)}"`);

    let textModel = null;
    try {
      textModel = await CLIPTextModelWithProjection.from_pretrained(this.modelId);
      const textInputs = this.tokenizer([text], { padding: true, truncation: true });
      const { text_embeds } = await textModel(textInputs);
      
      const embedding = Array.from(text_embeds.data);
      return normalizeVector(embedding);
    } finally {
      if (textModel) {
        try {
          await textModel.dispose();
          console.log('[Embedding] Text model session successfully disposed.');
        } catch (disposeError) {
          console.error('[Embedding] Error disposing text model:', disposeError.message);
        }
      }
      // Trigger garbage collection if exposed in Node (using --expose-gc)
      if (global.gc) {
        global.gc();
      }
    }
  }

  /**
   * Generates a normalized CLIP image embedding locally.
   * Dynamically loads and disposes of the model to keep memory footprint under 512MB on Render.
   */
  async getImageEmbedding(imageBuffer) {
    await this.initializeProcessor();
    console.log(`[Embedding] Generating image embedding (${imageBuffer.length} bytes)`);

    let visionModel = null;
    try {
      const blob = new Blob([imageBuffer]);
      const rawImage = await RawImage.fromBlob(blob);
      const imageInputs = await this.processor(rawImage);

      visionModel = await CLIPVisionModelWithProjection.from_pretrained(this.modelId);
      const { image_embeds } = await visionModel(imageInputs);
      
      const embedding = Array.from(image_embeds.data);
      return normalizeVector(embedding);
    } finally {
      if (visionModel) {
        try {
          await visionModel.dispose();
          console.log('[Embedding] Vision model session successfully disposed.');
        } catch (disposeError) {
          console.error('[Embedding] Error disposing vision model:', disposeError.message);
        }
      }
      // Trigger garbage collection if exposed in Node (using --expose-gc)
      if (global.gc) {
        global.gc();
      }
    }
  }
}

export const embeddingService = new EmbeddingService();
