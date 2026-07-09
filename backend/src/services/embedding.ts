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
function normalizeVector(embedding: number[]): number[] {
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return embedding;
  return embedding.map((val) => val / magnitude);
}

class EmbeddingService {
  private tokenizer: any = null;
  private processor: any = null;
  private textModel: any = null;
  private visionModel: any = null;
  private initialized = false;

  private async initialize() {
    if (this.initialized) return;

    console.log('[Embedding] Loading CLIP model components locally...');
    const modelId = 'Xenova/clip-vit-base-patch32';
    
    this.tokenizer = await AutoTokenizer.from_pretrained(modelId);
    this.processor = await AutoProcessor.from_pretrained(modelId);
    this.textModel = await CLIPTextModelWithProjection.from_pretrained(modelId);
    this.visionModel = await CLIPVisionModelWithProjection.from_pretrained(modelId);
    
    this.initialized = true;
    console.log('[Embedding] CLIP model components loaded successfully!');
  }

  /**
   * Generates a normalized CLIP text embedding locally.
   */
  async getTextEmbedding(text: string): Promise<number[]> {
    await this.initialize();
    console.log(`[Embedding] Generating text embedding locally for: "${text.substring(0, 60)}"`);
    
    const textInputs = this.tokenizer([text], { padding: true, truncation: true });
    const { text_embeds } = await this.textModel(textInputs);
    
    const embedding = Array.from(text_embeds.data) as number[];
    return normalizeVector(embedding);
  }

  /**
   * Generates a normalized CLIP image embedding locally.
   */
  async getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
    await this.initialize();
    console.log(`[Embedding] Generating image embedding locally (${imageBuffer.length} bytes)`);
    
    const blob = new Blob([imageBuffer]);
    const rawImage = await RawImage.fromBlob(blob);
    
    const imageInputs = await this.processor(rawImage);
    const { image_embeds } = await this.visionModel(imageInputs);
    
    const embedding = Array.from(image_embeds.data) as number[];
    return normalizeVector(embedding);
  }
}

export const embeddingService = new EmbeddingService();