import type { AIProvider, CompletionRequest, CompletionResponse, ProviderType } from '../types';

export abstract class BaseProvider implements AIProvider {
  abstract name: string;
  abstract type: ProviderType;

  protected systemPrompt: string;
  protected maxTokens: number;

  constructor(systemPrompt?: string, maxTokens?: number) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
    this.maxTokens = maxTokens || 50;
  }

  protected getDefaultSystemPrompt(): string {
    return `You are an intelligent text completion assistant. Your task is to complete the user's text naturally and helpfully.

Rules:
1. Complete only the current sentence or thought
2. Keep completions concise (1-2 sentences max)
3. Match the writing style and tone of the existing text
4. Do not repeat text that's already written
5. Return ONLY the completion text, nothing else
6. If the text seems complete, return an empty string
7. Do not add explanations or meta-commentary
8. Do not add any quote or specific character at the beginning or ending.`;
  }

  protected buildPrompt(request: CompletionRequest): string {
    const textBeforeCursor = request.text.substring(0, request.cursorPosition);
    const textAfterCursor = request.text.substring(request.cursorPosition);

    let prompt = `Complete the following text naturally. Return ONLY the completion, nothing else.\n\n`;

    if (request.context) {
      prompt += `Context: ${request.context}\n\n`;
    }

    prompt += `Text before cursor: "${textBeforeCursor}"\n`;

    if (textAfterCursor.trim()) {
      prompt += `Text after cursor: "${textAfterCursor}"\n`;
    }

    prompt += `\nProvide the completion:`;

    return prompt;
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;

  abstract isAvailable(): Promise<boolean>;
}
