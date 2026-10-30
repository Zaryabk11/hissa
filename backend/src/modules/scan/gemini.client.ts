import { NotImplementedError } from '../../shared/errors';

export interface DetectedDish {
  dish: string; // a catalog slug, or 'unknown'
  portion: number;
  confidence: number;
}

// Gemini may only answer from the catalog (structured output with an enum plus 'unknown').
// It never returns calorie numbers.
export interface GeminiClient {
  detectDishes(photo: Buffer, catalog: string[]): Promise<DetectedDish[]>;
}

export function createGeminiClient(_apiKey: string): GeminiClient {
  return {
    async detectDishes() {
      throw new NotImplementedError('gemini.detectDishes');
    },
  };
}
