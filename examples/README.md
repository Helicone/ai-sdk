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
Comprehensive example demonstrating how to use tool calling (function calling) with the Helicone provider. Includes:
- Weather lookup tool
- Mathematical calculation tool
- Tool execution tracking
- Usage statistics

## Notes

- Make sure you have a valid Helicone API key from [helicone.ai](https://helicone.ai)
- Some examples may require specific model access (e.g., GPT-4, Claude)
- All requests are tracked in your Helicone dashboard

