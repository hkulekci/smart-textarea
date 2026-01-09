import { useState, useCallback } from 'react';
import {
  AutocompleteProvider,
  OptimizedAutocompleteTextarea,
  useAutocompleteContext,
  type AnyProviderConfig,
  type ProviderType,
} from 'smart-textarea';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

function ConfigPanel() {
  const { setProvider, error } = useAutocompleteContext();

  const [providerType, setProviderType] = useState<ProviderType>('openai');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  const defaultModels: Record<ProviderType, string> = {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-1.5-flash',
    openrouter: 'openai/gpt-4o-mini',
    local: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    custom: '',
  };

  const handleProviderChange = (type: ProviderType) => {
    setProviderType(type);
    setModel(defaultModels[type]);
    setStatus('disconnected');
  };

  const handleConnect = async () => {
    if (providerType !== 'local' && !apiKey) {
      alert('Please enter an API key');
      return;
    }

    setStatus('connecting');

    try {
      let config: AnyProviderConfig;

      switch (providerType) {
        case 'openai':
          config = {
            type: 'openai',
            apiKey,
            model: model || defaultModels.openai,
          };
          break;
        case 'gemini':
          config = {
            type: 'gemini',
            apiKey,
            model: model || defaultModels.gemini,
          };
          break;
        case 'openrouter':
          config = {
            type: 'openrouter',
            apiKey,
            model: model || defaultModels.openrouter,
          };
          break;
        case 'local':
          config = {
            type: 'local',
            modelPath: model || defaultModels.local,
          };
          break;
        default:
          throw new Error('Unsupported provider type');
      }

      await setProvider(config);
      setStatus('connected');
    } catch {
      setStatus('disconnected');
    }
  };

  return (
    <div className="card">
      <h2>Provider Configuration</h2>

      <div className="config-grid">
        <div className="form-group">
          <label htmlFor="provider">AI Provider</label>
          <select
            id="provider"
            value={providerType}
            onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
            <option value="local">Local (WebLLM)</option>
          </select>
        </div>

        {providerType !== 'local' && (
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="model">Model</label>
          <input
            type="text"
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={defaultModels[providerType]}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="button button-primary"
          onClick={handleConnect}
          disabled={status === 'connecting'}
        >
          {status === 'connecting' ? 'Connecting...' : 'Connect'}
        </button>

        <span className={`status-badge ${status}`}>
          {status === 'connected' && '● Connected'}
          {status === 'disconnected' && '○ Disconnected'}
          {status === 'connecting' && '◌ Connecting...'}
        </span>
      </div>

      {error && <div className="error-message">{error.message}</div>}

      {providerType === 'local' && (
        <div className="hint-box" style={{ marginTop: '16px' }}>
          <h4>Local Model (WebLLM)</h4>
          <p style={{ margin: '0', fontSize: '0.9rem', color: '#666' }}>
            Runs entirely in your browser using WebGPU. Requires a modern browser with WebGPU support.
            The first load may take a few minutes to download and initialize the model.
          </p>
        </div>
      )}
    </div>
  );
}

function TextareaDemo() {
  const [text, setText] = useState('');
  const [acceptedCount, setAcceptedCount] = useState(0);

  const handleChange = useCallback((value: string) => {
    setText(value);
  }, []);

  const handleAccept = useCallback(() => {
    setAcceptedCount((c) => c + 1);
  }, []);

  return (
    <div className="card">
      <h2>Try It Out (Optimized)</h2>

      <OptimizedAutocompleteTextarea
        value={text}
        onChange={handleChange}
        onCompletionAccept={handleAccept}
        className="autocomplete-textarea"
        placeholder="Start typing to see AI suggestions... Completions trigger when you pause typing."
        pauseThreshold={600}
        minChars={15}
        cooldown={1500}
        triggerAtBreakpoints={true}
        enableCache={true}
        showStats={true}
        completionClassName="ghost-text"
      />

      <div className="hint-box">
        <h4>Optimizations</h4>
        <ul>
          <li>
            <strong>Smart Trigger:</strong> Only requests completion when you pause (600ms)
          </li>
          <li>
            <strong>Cooldown:</strong> 1.5s between API calls to prevent spam
          </li>
          <li>
            <strong>Caching:</strong> Reuses completions for similar text
          </li>
          <li>
            <strong>Minimal Prompt:</strong> Only sends last ~500 chars to save tokens
          </li>
          <li>
            Press <kbd>Tab</kbd> to accept, <kbd>Esc</kbd> to dismiss
          </li>
        </ul>
      </div>

      <div className="stats">
        <div className="stat-item">
          <div className="stat-value">{text.length}</div>
          <div className="stat-label">Characters</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{text.split(/\s+/).filter(Boolean).length}</div>
          <div className="stat-label">Words</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{acceptedCount}</div>
          <div className="stat-label">Accepted</div>
        </div>
      </div>
    </div>
  );
}

function CodeExample() {
  const codeSnippet = `import {
  AutocompleteProvider,
  OptimizedAutocompleteTextarea
} from 'smart-textarea';

function App() {
  const [text, setText] = useState('');

  return (
    <AutocompleteProvider
      initialConfig={{
        type: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      }}
    >
      <OptimizedAutocompleteTextarea
        value={text}
        onChange={setText}
        pauseThreshold={600}  // Trigger after 600ms pause
        minChars={15}         // Min 15 chars before triggering
        cooldown={1500}       // 1.5s between API calls
        enableCache={true}    // Cache completions
        showStats={true}      // Show API/cache stats
      />
    </AutocompleteProvider>
  );
}`;

  return (
    <div className="card">
      <h2>Quick Start</h2>
      <pre
        style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '20px',
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.85rem',
          lineHeight: '1.5',
        }}
      >
        <code>{codeSnippet}</code>
      </pre>
    </div>
  );
}

function App() {
  return (
    <AutocompleteProvider>
      <div className="container">
        <header className="header">
          <h1>AI Autocomplete Textarea</h1>
          <p>
            A React component that brings IDE-like AI completions to any textarea.
            <br />
            Supports OpenAI, Gemini, OpenRouter, and local browser models.
          </p>
        </header>

        <ConfigPanel />
        <TextareaDemo />
        <CodeExample />
      </div>
    </AutocompleteProvider>
  );
}

export default App;
