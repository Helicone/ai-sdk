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
import { createHelicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

// Initialize the provider
const helicone = createHelicone({
  apiKey: 'your-helicone-api-key'
});

// Generate text using GPT-4o
const result = await generateText({
  model: helicone('gpt-4o'),
  prompt: 'Write a haiku about AI',
});

console.log(result.text);
```

## Configuration

### Basic Setup

```typescript
import { createHelicone } from '@helicone/ai-sdk-provider';

const helicone = createHelicone({
  apiKey: 'your-helicone-api-key'
});
```

### Model Selection

Specify models by name only when making the request. For the complete list of supported model names, visit [helicone.ai/models](https://helicone.ai/models).

Helicone's AI gateway will automatically route to the cheapest provider:

```typescript
const result = await generateText({
  model: helicone('gpt-4o'),
  prompt: 'Write a haiku about AI'
});

console.log(result.text);
```

If you'd like to select your own provider, you can do so by passing the provider name as the second argument:

```typescript
const result = await generateText({
  helicone('claude-4.5-sonnet/anthropic');
  prompt: 'Write a haiku about AI'
});

console.log(result.text);
```

## Advanced Features

### Helicone Prompts Integration

Use prompts created in your [Helicone dashboard](https://helicone.ai/prompts) instead of hardcoding messages in your application.

```typescript
import { createHelicone } from '@helicone/ai-sdk-provider';
import type { WithHeliconePrompt } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

const helicone = createHelicone({ apiKey: 'your-helicone-api-key' });

const result = await generateText({
  model: helicone('gpt-4o', {
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
- 👩🏻‍💻 **Perfect for non-technical users**: No need to write code to create prompts, just use the Helicone dashboard.
- 🚀 **Lower Latency**: Single API call, no message construction overhead
- 🔧 **A/B Testing**: Test different prompt versions with environments
- 📊 **Better Analytics**: Track prompt performance across versions

### Session Tracking

```typescript
const result = await generateText({
  model: helicone('gpt-4o', {
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
  model: helicone('gpt-4o', {
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
  model: helicone('gpt-4o'),
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
  model: helicone('gpt-4o'),
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

### Agent Examples (JSON Schema vs Zod)

We ship two agent demos that are functionally identical but highlight different schema styles:
- `examples/agents-json.ts` uses `jsonSchema(...)` and a Groq model (`grok-4-fast-non-reasoning`).
- `examples/agents-zod.ts` uses raw Zod schemas and a different model (`gpt-5-chat-latest`).

Both send the same tool definitions through Helicone; any difference in behavior comes from model choice or prompt/tool-choice settings. To make their outputs align, use the same model ID in both, optionally set `toolChoice: { type: 'required' }`, or tighten the system prompt to force tool usage.

### Prompt Environments

Use different prompt versions for different environments:

```typescript
// Development environment
const devResult = await generateText({
  model: helicone('gpt-4o', {
    promptId: 'adsfo87yu', // Get this from your Helicone dashboard after saving your prompt
    inputs: { user_name: 'Alex' },
    environment: 'development'
  }),
  messages: [{ role: 'user', content: 'placeholder' }]
});

// Production environment
const prodResult = await generateText({
  model: helicone('gpt-4o', {
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
  model: helicone('gpt-4o', {
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

## Examples

This package includes comprehensive examples demonstrating various features and use cases. All examples can be run using `tsx`:

```bash
npx tsx examples/<example-name>.ts
```

### Available Examples

#### `basic.ts`
Simple text generation example showing basic usage of the Helicone provider with `generateText`.

#### `streaming.ts`
Demonstrates streaming responses from the model using `streamText`, including both `textStream` and `toUIMessageStreamResponse` methods.

#### `advanced-tracking.ts`
Shows how to use advanced tracking features like session IDs, user IDs, custom properties, tags, and caching for better observability.

#### `multiple-providers.ts`
Example of using multiple AI providers (e.g., Novita DeepSeek and Anthropic Claude) through Helicone's unified gateway, comparing responses from different models.

#### `tool-calling.ts`
Comprehensive example demonstrating how to use tool calling (function calling) with `generateText`. Includes weather lookup and mathematical calculation tools, showing how tool definitions are sent and tool call requests are received.

#### `stream-tool-calling.ts`
Demonstrates streaming with tool calling using `streamText`. Shows how to handle tool calls and results in a streaming context, including processing `fullStream` chunks for text deltas, tool calls, and tool results.

#### `streamText-tools-properties.ts`
Example showing tool calling with `streamText` and how to access tool properties in the streaming response, useful for debugging and monitoring tool execution.

#### `prompts.ts`
Comprehensive examples of Helicone prompts integration, including:
- Basic prompt usage with inputs
- Streaming with prompts
- Multiple environment configurations (development, staging, production)
- Prompts combined with tools
- Regular messages (without prompts) for comparison

#### `agent-tools.ts`
Demonstrates using the experimental `Agent` class with Helicone, showing a customer support agent with multiple tools (knowledge base search, workflow checking, ticket escalation) and detailed step-by-step execution tracking.

#### `agents-json.ts`
Agent demo using `jsonSchema(...)` helpers to define tool schemas. Shows how to structure agent tools using JSON Schema format.

#### `agents-zod.ts`
Agent demo using raw Zod schemas to define tool schemas. Functionally similar to `agents-json.ts` but demonstrates the Zod schema approach.

#### `validate-ui-messages.ts`
Example demonstrating how to use `validateUIMessages` with Helicone provider, commonly used in API routes. Shows how to handle AI SDK v6 UI message format with `parts` array, including validation, conversation history, and edge cases.

For more details, see the [examples README](examples/README.md).

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
