import type { CompletionRequest, CompletionResponse, LocalConfig, ProviderType } from '../types';
import { BaseProvider } from './base';

interface WebLLMEngine {
  reload: (model: string) => Promise<void>;
  generate: (prompt: string, options?: { max_tokens?: number }) => Promise<string>;
  chat: {
    completions: {
      create: (options: {
        messages: Array<{ role: string; content: string }>;
        max_tokens?: number;
        temperature?: number;
        stream?: boolean;
      }) => Promise<{
        choices: Array<{
          message: { content: string };
          finish_reason: string;
        }>;
      }>;
    };
  };
}

declare global {
  interface Window {
    webllm?: {
      CreateMLCEngine: (model: string, options?: { initProgressCallback?: (progress: { text: string; progress: number }) => void }) => Promise<WebLLMEngine>;
    };
  }
}

export class LocalProvider extends BaseProvider {
  name = 'Local (WebLLM)';
  type: ProviderType = 'local';

  private modelPath: string;
  private engine: WebLLMEngine | null = null;
  private isInitializing = false;
  private initPromise: Promise<void> | null = null;
  private onProgress?: (progress: { text: string; progress: number }) => void;

  constructor(config: LocalConfig & { onProgress?: (progress: { text: string; progress: number }) => void }) {
    super(config.systemPrompt, config.maxTokens);
    this.modelPath = config.modelPath || 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
    this.onProgress = config.onProgress;
  }

  private async initializeEngine(): Promise<void> {
    if (this.engine) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    if (!window.webllm) {
      throw new Error(
        'WebLLM is not loaded. Please include the WebLLM script: <script src="https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm"></script>'
      );
    }

    this.isInitializing = true;

    this.initPromise = (async () => {
      try {
        this.engine = await window.webllm!.CreateMLCEngine(this.modelPath, {
          initProgressCallback: this.onProgress,
        });
      } finally {
        this.isInitializing = false;
      }
    })();

    await this.initPromise;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    await this.initializeEngine();

    if (!this.engine) {
      throw new Error('Failed to initialize WebLLM engine');
    }

    const prompt = this.buildPrompt(request);

    const response = await this.engine.chat.completions.create({
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: request.maxTokens || this.maxTokens,
      temperature: 0.7,
      stream: false,
    });

    const completion = response.choices?.[0]?.message?.content?.trim() || '';

    return {
      completion,
      confidence: response.choices?.[0]?.finish_reason === 'stop' ? 1 : 0.8,
    };
  }

  async isAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!window.webllm) {
      return false;
    }

    // Check for WebGPU support
    if (!('gpu' in navigator)) {
      return false;
    }

    try {
      const gpu = (navigator as Navigator & { gpu: { requestAdapter: () => Promise<unknown> } }).gpu;
      const adapter = await gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  isInitializingEngine(): boolean {
    return this.isInitializing;
  }
}
