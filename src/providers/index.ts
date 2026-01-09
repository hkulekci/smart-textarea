import type { AIProvider, AnyProviderConfig } from '../types';
import { OpenAIProvider } from './openai';
import { GeminiProvider } from './gemini';
import { OpenRouterProvider } from './openrouter';
import { LocalProvider } from './local';
import { CustomProvider } from './custom';

export { BaseProvider } from './base';
export { OpenAIProvider } from './openai';
export { StreamingOpenAIProvider } from './streaming-openai';
export { GeminiProvider } from './gemini';
export { OpenRouterProvider } from './openrouter';
export { LocalProvider } from './local';
export { CustomProvider } from './custom';

export function createProvider(config: AnyProviderConfig): AIProvider {
  switch (config.type) {
    case 'openai':
      return new OpenAIProvider(config);
    case 'gemini':
      return new GeminiProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    case 'local':
      return new LocalProvider(config);
    case 'custom':
      return new CustomProvider(config);
    default:
      throw new Error(`Unknown provider type: ${(config as AnyProviderConfig).type}`);
  }
}
