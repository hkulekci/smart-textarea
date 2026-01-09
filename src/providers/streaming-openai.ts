import type { CompletionRequest, CompletionResponse, OpenAIConfig, ProviderType } from '../types';
import { BaseProvider } from './base';

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class StreamingOpenAIProvider extends BaseProvider {
  name = 'OpenAI (Streaming)';
  type: ProviderType = 'openai';

  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor(config: OpenAIConfig) {
    super(config.systemPrompt, config.maxTokens);
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async completeStreaming(
    request: CompletionRequest,
    callbacks: StreamingCallbacks
  ): Promise<void> {
    this.abort();
    this.abortController = new AbortController();

    const prompt = this.buildMinimalPrompt(request);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: this.getMinimalSystemPrompt() },
            { role: 'user', content: prompt },
          ],
          max_tokens: request.maxTokens || this.maxTokens,
          temperature: 0.7,
          stream: true,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              fullText += token;
              callbacks.onToken?.(token);
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }

      callbacks.onComplete?.(fullText);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    }
  }

  private getMinimalSystemPrompt(): string {
    return `Complete the text naturally. Return ONLY the completion (1 sentence max). No explanations.`;
  }

  private buildMinimalPrompt(request: CompletionRequest): string {
    const textBeforeCursor = request.text.substring(0, request.cursorPosition);

    // Sadece son 500 karakter (yaklaşık son 2-3 cümle)
    const contextLength = 500;
    const context = textBeforeCursor.length > contextLength
      ? '...' + textBeforeCursor.slice(-contextLength)
      : textBeforeCursor;

    return context;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.abort();
    this.abortController = new AbortController();

    const prompt = this.buildMinimalPrompt(request);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.getMinimalSystemPrompt() },
          { role: 'user', content: prompt },
        ],
        max_tokens: request.maxTokens || this.maxTokens,
        temperature: 0.7,
        stream: false,
      }),
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const completion = data.choices?.[0]?.message?.content?.trim() || '';

    return { completion };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
