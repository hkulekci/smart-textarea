# Smart Textarea

A React library that brings IDE-like AI-powered text completions to any textarea. Supports multiple AI providers including OpenAI, Google Gemini, OpenRouter, and local browser-based models.

## Features

- **Ghost text completions** - See suggestions as faded text after your cursor
- **Tab to accept** - Press Tab to accept suggestions, Escape to dismiss
- **Multiple AI providers** - OpenAI, Gemini, OpenRouter, WebLLM (local)
- **Customizable** - Debounce timing, minimum characters, styling
- **TypeScript** - Full type definitions included
- **Lightweight** - No heavy dependencies

## Installation

```bash
npm install smart-textarea
```

## Quick Start

```tsx
import {
  AutocompleteProvider,
  AutocompleteTextarea
} from 'smart-textarea';

function App() {
  const [text, setText] = useState('');

  return (
    <AutocompleteProvider
      initialConfig={{
        type: 'openai',
        apiKey: 'your-api-key',
        model: 'gpt-4o-mini',
      }}
    >
      <AutocompleteTextarea
        value={text}
        onChange={setText}
        placeholder="Start typing..."
      />
    </AutocompleteProvider>
  );
}
```

## Provider Configuration

### OpenAI

```tsx
<AutocompleteProvider
  initialConfig={{
    type: 'openai',
    apiKey: 'sk-...',
    model: 'gpt-4o-mini', // optional, default: gpt-4o-mini
    baseUrl: 'https://api.openai.com/v1', // optional
  }}
>
```

### Google Gemini

```tsx
<AutocompleteProvider
  initialConfig={{
    type: 'gemini',
    apiKey: 'your-gemini-api-key',
    model: 'gemini-1.5-flash', // optional
  }}
>
```

### OpenRouter

```tsx
<AutocompleteProvider
  initialConfig={{
    type: 'openrouter',
    apiKey: 'your-openrouter-api-key',
    model: 'openai/gpt-4o-mini', // optional
    siteUrl: 'https://yoursite.com', // optional
    siteName: 'Your App', // optional
  }}
>
```

### Local (WebLLM)

Run models entirely in the browser using WebGPU:

```tsx
<AutocompleteProvider
  initialConfig={{
    type: 'local',
    modelPath: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', // optional
  }}
>
```

> Note: WebLLM requires WebGPU support and will download the model on first use.

### Custom Provider

Create your own completion handler:

```tsx
<AutocompleteProvider
  initialConfig={{
    type: 'custom',
    handler: async (request) => {
      // Your custom logic here
      const completion = await myCustomAPI(request.text);
      return { completion };
    },
  }}
>
```

## Component Props

### AutocompleteTextarea

| Prop                    | Type                      | Default    | Description                            |
|-------------------------|---------------------------|------------|----------------------------------------|
| `value`                 | `string`                  | required   | The textarea value                     |
| `onChange`              | `(value: string) => void` | required   | Called when value changes              |
| `debounceMs`            | `number`                  | `300`      | Delay before requesting completion     |
| `minCharsForCompletion` | `number`                  | `10`       | Minimum characters before triggering   |
| `acceptKey`             | `string`                  | `'Tab'`    | Key to accept completion               |
| `dismissKey`            | `string`                  | `'Escape'` | Key to dismiss completion              |
| `showGhostText`         | `boolean`                 | `true`     | Show ghost text overlay                |
| `triggerOnSentenceEnd`  | `boolean`                 | `true`     | Trigger on sentence-ending punctuation |
| `completionClassName`   | `string`                  | -          | CSS class for ghost text               |
| `onCompletionAccept`    | `(text: string) => void`  | -          | Called when completion is accepted     |
| `onCompletionDismiss`   | `() => void`              | -          | Called when completion is dismissed    |

Plus all standard textarea attributes.

## Hooks

### useAutocomplete

Low-level hook for custom implementations:

```tsx
import { useAutocomplete, useAutocompleteContext } from 'smart-textarea';

function CustomTextarea() {
  const { provider } = useAutocompleteContext();
  const {
    completion,
    isLoading,
    error,
    acceptCompletion,
    dismissCompletion,
    requestCompletion,
  } = useAutocomplete(provider, {
    debounceMs: 300,
    minCharsForCompletion: 10,
  });

  // Build your custom UI
}
```

### useAutocompleteContext

Access the provider context:

```tsx
import { useAutocompleteContext } from 'smart-textarea';

function ProviderStatus() {
  const { provider, isLoading, error, setProvider } = useAutocompleteContext();

  return (
    <div>
      {provider ? `Connected to ${provider.name}` : 'Not connected'}
    </div>
  );
}
```

## Dynamic Provider Switching

Change providers at runtime:

```tsx
function ProviderSwitcher() {
  const { setProvider } = useAutocompleteContext();

  const switchToGemini = () => {
    setProvider({
      type: 'gemini',
      apiKey: 'your-key',
    });
  };

  return <button onClick={switchToGemini}>Switch to Gemini</button>;
}
```

## Styling

The component uses inline styles by default. Override with CSS:

```css
/* Style the textarea */
.my-textarea {
  border: 2px solid #ccc;
  border-radius: 8px;
  padding: 16px;
  font-size: 16px;
}

/* Style the ghost text */
.my-ghost-text {
  color: #999;
  font-style: italic;
}
```

```tsx
<AutocompleteTextarea
  className="my-textarea"
  completionClassName="my-ghost-text"
  // ...
/>
```

## Example App

Run the example application:

```bash
cd example
npm install
npm run dev
```

## Security Note

Never expose API keys in client-side code for production. Use a backend proxy:

```tsx
// Instead of exposing your key:
<AutocompleteProvider
  initialConfig={{
    type: 'openai',
    apiKey: 'sk-...', // DON'T do this in production!
  }}
>

// Use a custom provider that calls your backend:
<AutocompleteProvider
  initialConfig={{
    type: 'custom',
    handler: async (request) => {
      const res = await fetch('/api/complete', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return res.json();
    },
  }}
>
```

## License

MIT
