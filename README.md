# Helicone AI SDK Provider

A [Vercel AI SDK](https://ai-sdk.dev/) provider for [Helicone](https://helicone.ai/), enabling seamless integration with Helicone's AI gateway and observability platform.

## Features

- ✅ **100+ AI Models**: Access to OpenAI, Anthropic, Google, Groq, and more through Helicone's AI gateway
- ✅ **Observability**: Automatic request logging, metrics, and monitoring through Helicone
- ✅ **Model Switching**: Easy switching between different AI providers and models
- ✅ **Fallbacks**: Configure model fallbacks for improved reliability
- ✅ **Caching**: Built-in caching support for faster responses
- ✅ **Sessions & Tags**: Organize requests with sessions, user IDs, and custom tags
- ✅ **BYOK**: Bring your own key
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
  apiKey: 'your-helicone-api-key'
});
```

### Model Selection

Specify models by name only when making the request. For the complete list of supported model names, visit [helicone.ai/models](https://helicone.ai/models).

Helicone's AI gateway will automatically route to the appropriate provider:

```typescript
gateway.languageModel('gpt-4o')
gateway.languageModel('claude-4.5-sonnet')
gateway.languageModel('gemini-2.5-pro')
gateway.languageModel('grok-4')
```

If you'd like to select your own provider, you can do so by passing the provider name as the second argument:

```typescript
gateway.languageModel('gpt-4o/openai');
gateway.languageModel('claude-4.5-sonnet/anthropic');
gateway.languageModel('gemini-2.5-pro/google');
gateway.languageModel('grok-4/xai');
```

## Advanced Features

### Helicone Prompts Integration

Use prompts created in your [Helicone dashboard](https://helicone.ai/prompts) instead of hardcoding messages in your application.

```typescript
import { helicone } from '@helicone/ai-sdk-provider';
import type { WithHeliconePrompt } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

const result = await generateText({
  model: gateway.languageModel('gpt-4o', {
    promptId: 'sg45wqc' // Get this from your Helicone dashboard after saving your prompt,
    inputs: {
      customer_name: 'Sarah Johnson',
      issue_type: 'billing',
      account_type: 'premium'
    },
    environment: 'production', // optional, defaults to 'production'
    extraBody: {
      helicone: {
        sessionId: 'support-session-123',
        properties: {
          department: 'customer-support'
        }
      }
    }
  }),
  messages: [{ role: 'user', content: 'placeholder' }] // Required by AI SDK, ignored when using promptId
} as WithHeliconePrompt);
```

> **Note:** When using `promptId`, you must still pass a placeholder `messages` array to satisfy the Vercel AI SDK's validation. The actual prompt content will be fetched from your Helicone dashboard, and the placeholder messages will be ignored.

**Benefits of using Helicone prompts:**
- 🎯 **Centralized Management**: Update prompts without code changes
- 🚀 **Lower Latency**: Single API call, no message construction overhead
- 🔧 **A/B Testing**: Test different prompt versions with environments
- 📊 **Better Analytics**: Track prompt performance across versions

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
        location: z.string().describe('The city name')
      }),
      execute: async (args) => {
        // Your weather API call here
        return `It's sunny in ${args.location}`;
      }
    })
  }
});

console.log(result.text);
```

See `examples/tool-calling.ts` for a complete example.

### Prompt Environments

Use different prompt versions for different environments:

```typescript
// Development environment
const devResult = await generateText({
  model: gateway.languageModel('gpt-4o', {
    promptId: 'adsfo87yu', // Get this from your Helicone dashboard after saving your prompt
    inputs: { user_name: 'Alex' },
    environment: 'development'
  }),
  messages: [{ role: 'user', content: 'placeholder' }]
});

// Production environment
const prodResult = await generateText({
  model: gateway.languageModel('gpt-4o', {
    promptId: '32q5wre', // Get this from your Helicone dashboard after saving your prompt
    inputs: { user_name: 'Alex' },
    environment: 'production' // or omit for default
  }),
  messages: [{ role: 'user', content: 'placeholder' }]
});
```

### Combining Prompts with Streaming

```typescript
const result = await streamText({
  model: gateway.languageModel('gpt-4o', {
    promptId: 'asdfa67',
    inputs: {
      topic: 'artificial intelligence',
      tone: 'professional',
      length: 'medium'
    }
  }),
  messages: [{ role: 'user', content: 'placeholder' }]
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

See `examples/prompts.ts` for comprehensive prompt integration examples.

## BYOK - Bring your own key

You can also configure your provider using your own provider API key in your [Helicone account settings](https://us.helicone.ai/settings/providers).

## Supported Models

The provider supports all models available through Helicone's AI gateway, including:

- **OpenAI**: gpt-4o, gpt-4o-mini, chatgpt-4o-latest, o3, o3-mini, etc.
- **Anthropic**: claude-4.5-sonnet, claude-3.7-sonnet, claude-3.5-haiku, claude-opus-4, etc.
- **Google**: gemini-2.5-pro, gemini-2.5-flash, gemma-3-12b-it, etc.
- **xAI**: grok-4, grok-code-fast-1
- **And many more providers**

For the complete and up-to-date list of supported models, visit [helicone.ai/models](https://helicone.ai/models).

## License

MIT © [Helicone](https://helicone.ai)

## Links

- [Helicone Website](https://helicone.ai)
- [Helicone Documentation](https://docs.helicone.ai)
- [Vercel AI SDK](https://ai-sdk.dev/)
- [Helicone GitHub Repository](https://github.com/Helicone/helicone)
