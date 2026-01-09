import type { CompletionRequest, CompletionResponse, OpenAIConfig, ProviderType } from '../types';
import { BaseProvider } from './base';

export class OpenAIProvider extends BaseProvider {
  name = 'OpenAI';
  type: ProviderType = 'openai';

  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    super(config.systemPrompt, config.maxTokens);
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const prompt = this.buildPrompt(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const completion = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      completion,
      confidence: data.choices?.[0]?.finish_reason === 'stop' ? 1 : 0.8,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
