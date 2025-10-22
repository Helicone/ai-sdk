# Helicone Gateway Tool Calling Demo - Fixed Version

This is the corrected version of the helicone-gateway-tool-calling-demo that addresses the HTTP 401 Unauthorized error.

## The Problem

The original demo was failing with:
```
HeliconeError: HTTP 401: Unauthorized
```

## Root Cause

The error occurs because the Helicone AI Gateway requires:
1. A valid Helicone API key
2. Provider API keys configured in your Helicone account

## Setup Instructions

### 1. Get Your Helicone API Key
1. Go to [Helicone API Keys](https://us.helicone.ai/settings/keys)
2. Create a new API key if you don't have one
3. Copy the API key

### 2. Configure Provider API Keys
1. Go to [Helicone Providers](https://us.helicone.ai/settings/providers)
2. Add your **OpenAI API key** (required for gpt-4o-mini)
3. You can add keys for other providers (Anthropic, Google, etc.) as needed

### 3. Set Environment Variables
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and add your Helicone API key:
   ```
   HELICONE_API_KEY=your-actual-helicone-api-key
   ```

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Run the Demo
```bash
# Run with Helicone gateway (default)
pnpm start:gateway

# Or run with direct OpenAI (for comparison)
pnpm start:openai
```

## What's Fixed

1. **Environment Variable Validation**: The script now checks if `HELICONE_API_KEY` is set and provides helpful error messages
2. **Better Error Handling**: More descriptive error messages that guide you to the solution
3. **Complete Implementation**: The original demo had incomplete code - this version includes the full streaming implementation
4. **Setup Documentation**: Clear instructions on how to configure your Helicone account

## Expected Output

When working correctly, you should see:
```
Testing tool calling with gateway...

=== Response ===
{ type: 'start' }
{ type: 'tool-call', ... }
{ type: 'tool-result', ... }
{ type: 'text-delta', ... }
...

=== Final Response ===
The weather in San Francisco is currently [temperature]°F.

=== Usage Info ===
Usage: { inputTokens: X, outputTokens: Y, totalTokens: Z }

=== Tool Calls ===
Tool Calls: [...]

=== Tool Results ===
Tool Results: [...]
```

## Troubleshooting

If you still get errors:

1. **401 Unauthorized**:
   - Check your Helicone API key is correct
   - Ensure you've configured OpenAI API key in Helicone providers settings

2. **403 Forbidden**:
   - Check your Helicone account limits
   - Verify your provider API keys are valid

3. **404 Not Found**:
   - Model might not be available
   - Check [available models](https://helicone.ai/models)

## Learn More

- [Helicone Documentation](https://docs.helicone.ai)
- [Helicone AI Gateway](https://helicone.ai/gateway)
- [Vercel AI SDK](https://ai-sdk.dev/)