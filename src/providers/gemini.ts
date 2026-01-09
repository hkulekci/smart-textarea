import type { CompletionRequest, CompletionResponse, GeminiConfig, ProviderType } from '../types';
import { BaseProvider } from './base';

export class GeminiProvider extends BaseProvider {
  name = 'Gemini';
  type: ProviderType = 'gemini';

  private apiKey: string;
  private model: string;

  constructor(config: GeminiConfig) {
    super(config.systemPrompt, config.maxTokens);
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const prompt = this.buildPrompt(request);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${this.systemPrompt}\n\n${prompt}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: request.maxTokens || this.maxTokens,
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const completion = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    return {
      completion,
      confidence: data.candidates?.[0]?.finishReason === 'STOP' ? 1 : 0.8,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }
}
