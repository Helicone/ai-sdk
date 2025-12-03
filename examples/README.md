# Examples

This directory contains examples demonstrating how to use the Helicone AI SDK Provider with the Vercel AI SDK.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your Helicone API key:
```bash
HELICONE_API_KEY=your_api_key_here
```

## Running Examples

You can run any example using `tsx`:

```bash
npx tsx examples/basic.ts
npx tsx examples/streaming.ts
npx tsx examples/advanced-tracking.ts
npx tsx examples/multiple-providers.ts
npx tsx examples/tool-calling.ts
npx tsx examples/stream-tool-calling.ts
npx tsx examples/streamText-tools-properties.ts
npx tsx examples/prompts.ts
npx tsx examples/agent-tools.ts
npx tsx examples/agents-json.ts
npx tsx examples/agents-zod.ts
npx tsx examples/validate-ui-messages.ts
```

## Available Examples

### basic.ts
Simple text generation example showing basic usage of the Helicone provider.

### streaming.ts
Demonstrates streaming responses from the model.

### advanced-tracking.ts
Shows how to use advanced tracking features like session IDs, user IDs, custom properties, tags, and caching.

### multiple-providers.ts
Example of using multiple AI providers (OpenAI and Anthropic) through Helicone.

### tool-calling.ts
Comprehensive example demonstrating how to use tool calling (function calling) with `generateText`.

Note: `generateText` returns tool call requests but does not execute them automatically. For automatic tool execution, see `stream-tool-calling.ts`.

### stream-tool-calling.ts
Demonstrates streaming with tool calling using `streamText`. Shows how to handle tool calls and results in a streaming context, including processing `fullStream` chunks for text deltas, tool calls, and tool results. Includes weather and calculation tools with automatic execution.

### streamText-tools-properties.ts
Example showing tool calling with `streamText` and how to access tool properties in the streaming response. Useful for debugging and monitoring tool execution in real-time.

### prompts.ts
Comprehensive examples of Helicone prompts integration, including:
- Basic prompt usage with inputs
- Streaming with prompts
- Multiple environment configurations (development, staging, production)
- Prompts combined with tools
- Regular messages (without prompts) for comparison

### agent-tools.ts
Demonstrates using the experimental `Agent` class with Helicone, showing a customer support agent with multiple tools.

Includes detailed step-by-step execution tracking and tool call/result logging.

### agents-json.ts
Agent demo using `jsonSchema(...)` helpers to define tool schemas. Shows how to structure agent tools using JSON Schema format.

### agents-zod.ts
Agent demo using raw Zod schemas to define tool schemas. Functionally similar to `agents-json.ts` but demonstrates the Zod schema approach.

Both `agents-json.ts` and `agents-zod.ts` send the same tool definitions; any behavioral differences stem from model choice or prompt/tool-choice settings (e.g., forcing `toolChoice: { type: 'required' }`).

### validate-ui-messages.ts
Example demonstrating how to use `validateUIMessages` with Helicone provider, commonly used in API routes. Shows how to handle AI SDK v6 UI message format with `parts` array, including:
- Message validation
- Conversation history handling
- Edge cases and different message types
- Integration with the Agent class

## Notes

- Make sure you have a valid Helicone API key from [helicone.ai](https://helicone.ai)
- Some examples may require specific model access (e.g., GPT-4, Claude)
- All requests are tracked in your Helicone dashboard
