import type { CompletionRequest, CompletionResponse, CustomProviderConfig, ProviderType, AIProvider } from '../types';

export class CustomProvider implements AIProvider {
  name = 'Custom';
  type: ProviderType = 'custom';

  private handler: (request: CompletionRequest) => Promise<CompletionResponse>;

  constructor(config: CustomProviderConfig) {
    this.handler = config.handler;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    return this.handler(request);
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }
}
