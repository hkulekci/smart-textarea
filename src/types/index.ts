export type ProviderType = 'openai' | 'gemini' | 'openrouter' | 'local' | 'custom';

export interface CompletionRequest {
  text: string;
  cursorPosition: number;
  context?: string;
  maxTokens?: number;
}

export interface CompletionResponse {
  completion: string;
  confidence?: number;
}

export interface AIProvider {
  name: string;
  type: ProviderType;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  isAvailable(): Promise<boolean>;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  systemPrompt?: string;
  maxTokens?: number;
}

export interface OpenAIConfig extends ProviderConfig {
  type: 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface GeminiConfig extends ProviderConfig {
  type: 'gemini';
  apiKey: string;
  model?: string;
}

export interface OpenRouterConfig extends ProviderConfig {
  type: 'openrouter';
  apiKey: string;
  model?: string;
  siteUrl?: string;
  siteName?: string;
}

export interface LocalConfig extends ProviderConfig {
  type: 'local';
  modelPath?: string;
  wasmPath?: string;
}

export interface CustomProviderConfig extends ProviderConfig {
  type: 'custom';
  handler: (request: CompletionRequest) => Promise<CompletionResponse>;
}

export type AnyProviderConfig =
  | OpenAIConfig
  | GeminiConfig
  | OpenRouterConfig
  | LocalConfig
  | CustomProviderConfig;

export interface AutocompleteContextValue {
  provider: AIProvider | null;
  isLoading: boolean;
  error: Error | null;
  setProvider: (config: AnyProviderConfig) => void;
}

export interface AutocompleteTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  minCharsForCompletion?: number;
  acceptKey?: string;
  dismissKey?: string;
  showGhostText?: boolean;
  completionClassName?: string;
  onCompletionAccept?: (completion: string) => void;
  onCompletionDismiss?: () => void;
  disabled?: boolean;
  triggerOnSentenceEnd?: boolean;
}

export interface UseAutocompleteOptions {
  debounceMs?: number;
  minCharsForCompletion?: number;
  triggerOnSentenceEnd?: boolean;
  enabled?: boolean;
}

export interface UseAutocompleteReturn {
  completion: string | null;
  isLoading: boolean;
  error: Error | null;
  acceptCompletion: () => string;
  dismissCompletion: () => void;
  requestCompletion: (text: string, cursorPosition: number) => void;
}
