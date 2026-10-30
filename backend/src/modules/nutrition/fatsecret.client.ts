import { NotImplementedError } from '../../shared/errors';
import type { NutritionPerServing } from './nutrition.types';

export interface FatSecretClient {
  getServing(foodId: string): Promise<NutritionPerServing>;
}

// Will use the OAuth2 client-credentials flow. Basic edition: do not cache results long term.
export function createFatSecretClient(_clientId: string, _clientSecret: string): FatSecretClient {
  return {
    async getServing() {
      throw new NotImplementedError('fatsecret.getServing');
    },
  };
}
