import type { CompletionRequest, CompletionResponse, OpenRouterConfig, ProviderType } from '../types';
import { BaseProvider } from './base';

export class OpenRouterProvider extends BaseProvider {
  name = 'OpenRouter';
  type: ProviderType = 'openrouter';

  private apiKey: string;
  private model: string;
  private siteUrl?: string;
  private siteName?: string;

  constructor(config: OpenRouterConfig) {
    super(config.systemPrompt, config.maxTokens);
    this.apiKey = config.apiKey;
    this.model = config.model || 'openai/gpt-4o-mini';
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const prompt = this.buildPrompt(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.siteUrl) {
      headers['HTTP-Referer'] = this.siteUrl;
    }
    if (this.siteName) {
      headers['X-Title'] = this.siteName;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenRouter API error: ${response.status}`);
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
      const response = await fetch('https://openrouter.ai/api/v1/models', {
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
