import { 
  AutoTokenizer, 
  CLIPTextModelWithProjection, 
  AutoProcessor, 
  CLIPVisionModelWithProjection, 
  RawImage 
} from '@xenova/transformers';
import sharp from 'sharp';

class EmbeddingService {
  private tokenizer: any = null;
  private textModel: any = null;
  private processor: any = null;
  private visionModel: any = null;

  private async init() {
    const modelId = 'Xenova/clip-vit-base-patch32';
    if (!this.textModel) {
      console.log('Initializing CLIP Text components...');
      this.tokenizer = await AutoTokenizer.from_pretrained(modelId);
      this.textModel = await CLIPTextModelWithProjection.from_pretrained(modelId);
    }
    if (!this.visionModel) {
      console.log('Initializing CLIP Vision components...');
      this.processor = await AutoProcessor.from_pretrained(modelId);
      this.visionModel = await CLIPVisionModelWithProjection.from_pretrained(modelId);
      console.log('CLIP models loaded successfully.');
    }
  }

  async getTextEmbedding(text: string): Promise<number[]> {
    await this.init();
    const text_inputs = this.tokenizer(text, { padding: 'max_length', truncation: true });
    const { text_embeds } = await this.textModel(text_inputs);
    return Array.from(text_embeds.normalize().data);
  }

  async getImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
    await this.init();
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rawImage = new RawImage(new Uint8ClampedArray(data), info.width, info.height, info.channels);
    const image_inputs = await this.processor(rawImage);
    const { image_embeds } = await this.visionModel(image_inputs);
    return Array.from(image_embeds.normalize().data);
  }
}

export const embeddingService = new EmbeddingService();