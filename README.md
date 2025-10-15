# Helicone AI SDK Provider

A [Vercel AI SDK](https://ai-sdk.dev/) provider for [Helicone](https://helicone.ai/), enabling seamless integration with Helicone's AI gateway and observability platform.

## Features

- ✅ **100+ AI Models**: Access to OpenAI, Anthropic, Google, Groq, Cohere, and more through Helicone's AI gateway
- ✅ **Observability**: Automatic request logging, metrics, and monitoring through Helicone
- ✅ **Model Switching**: Easy switching between different AI providers and models
- ✅ **Fallbacks**: Configure model fallbacks for improved reliability
- ✅ **Caching**: Built-in caching support for faster responses
- ✅ **Sessions & Tags**: Organize requests with sessions, user IDs, and custom tags
- ✅ **TypeScript**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install @helicone/ai-sdk-provider ai
```

## Quick Start

```typescript
import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

// Initialize the provider
const gateway = helicone({
  apiKey: 'your-helicone-api-key'
});

// Generate text using GPT-4o
const result = await generateText({
  model: gateway.languageModel('gpt-4o'),
  prompt: 'Write a haiku about AI',
});

console.log(result.text);
```

## Configuration

### Basic Setup

```typescript
import { helicone } from '@helicone/ai-sdk-provider';

const gateway = helicone({
  apiKey: 'your-helicone-api-key', // Required for observability
  baseURL: 'https://ai-gateway.helicone.ai' // Optional, defaults to Helicone's gateway
});
```

### Model Selection

Specify models by name only. Helicone's AI gateway will automatically route to the appropriate provider:

```typescript
// OpenAI models
gateway.languageModel('gpt-4o')
gateway.languageModel('gpt-4o-mini')
gateway.languageModel('chatgpt-4o-latest')

// Anthropic models
gateway.languageModel('claude-3.7-sonnet')
gateway.languageModel('claude-4.5-sonnet')
gateway.languageModel('claude-3.5-haiku')

// Google models
gateway.languageModel('gemini-2.5-pro')
gateway.languageModel('gemini-2.5-flash')

// xAI models
gateway.languageModel('grok-4')
```

For the complete list of supported model names, visit [helicone.ai/models](https://helicone.ai/models).

## Advanced Features

### Session Tracking

```typescript
const result = await generateText({
  model: gateway.languageModel('gpt-4o', {
    extraBody: {
      helicone: {
        sessionId: 'user-chat-session-123',
        userId: 'user-456',
        properties: {
          environment: 'production',
          feature: 'chat',
        },
      },
    },
  }),
  prompt: 'Hello!',
});
```

### Model Fallbacks

```typescript
const result = await generateText({
  model: gateway.languageModel('gpt-4o', {
    extraBody: {
      helicone: {
        fallbacks: [
          { model: 'claude-3.7-sonnet' },
          { model: 'gpt-4o-mini' },
        ],
      },
    },
  }),
  prompt: 'Analyze this data...',
});
```

### Caching

```typescript
const result = await generateText({
  model: gateway.languageModel('gpt-4o', {
    extraBody: {
      helicone: {
        cache: true, // Enable caching for this request
      },
    },
  }),
  prompt: 'What is the capital of France?',
});
```

### Custom Tags and Properties

```typescript
const result = await generateText({
  model: gateway.languageModel('gpt-4o', {
    extraBody: {
      helicone: {
        tags: ['customer-support', 'urgent'],
        properties: {
          ticketId: 'TICKET-789',
          priority: 'high',
          department: 'support',
        },
      },
    },
  }),
  prompt: 'Help resolve this customer issue...',
});
```

### Streaming

```typescript
import { streamText } from 'ai';

const result = await streamText({
  model: gateway.languageModel('gpt-4o'),
  prompt: 'Write a long story about space exploration',
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Tool Calling

```typescript
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: gateway.languageModel('gpt-4o'),
  prompt: 'What is the weather like in San Francisco?',
  tools: {
    getWeather: tool({
      description: 'Get weather for a location',
      parameters: z.object({
        location: z.string().describe('The city name'),
      }),
      execute: async ({ location }) => {
        // Your weather API call here
        return `It's sunny in ${location}`;
      },
    }),
  },
});
```

## Environment Variables

You can also configure the provider using environment variables:

```bash
HELICONE_API_KEY=your-helicone-api-key
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

```typescript
// Will automatically use environment variables
const provider = helicone();
```

## Error Handling

```typescript
import { HeliconeError } from '@helicone/ai-sdk-provider';

try {
  const result = await generateText({
    model: provider.languageModel('gpt-4o'),
    prompt: 'Hello!',
  });
} catch (error) {
  if (HeliconeError.isHeliconeError(error)) {
    console.error('Helicone Error:', error.data);
    console.error('Status:', error.response?.status);
  } else {
    console.error('Other error:', error);
  }
}
```

## Supported Models

The provider supports all models available through Helicone's AI gateway, including:

- **OpenAI**: gpt-4o, gpt-4o-mini, chatgpt-4o-latest, o3, o3-mini, etc.
- **Anthropic**: claude-4.5-sonnet, claude-3.7-sonnet, claude-3.5-haiku, claude-opus-4, etc.
- **Google**: gemini-2.5-pro, gemini-2.5-flash, gemma-3-12b-it, etc.
- **xAI**: grok-4, grok-code-fast-1
- **And many more providers**

For the complete and up-to-date list of supported models, visit [helicone.ai/models](https://helicone.ai/models).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT © [Helicone](https://helicone.ai)

## Links

- [Helicone Website](https://helicone.ai)
- [Helicone Documentation](https://docs.helicone.ai)
- [Vercel AI SDK](https://ai-sdk.dev/)
- [GitHub Repository](https://github.com/Helicone/helicone-vercel-ai-sdk)
