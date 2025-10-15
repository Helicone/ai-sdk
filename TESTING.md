# Testing Guide for Helicone AI SDK Provider

This guide shows you how to test the Helicone provider implementation at different levels.

## Prerequisites

1. **Get API Keys** (for real API testing):
   - **Helicone API Key**: Sign up at [helicone.ai](https://helicone.ai) and get your API key
   - **OpenAI API Key**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
   - **Optional**: Other provider keys (Anthropic, etc.) for multi-provider testing

2. **Set Environment Variables**:
   ```bash
   export HELICONE_API_KEY=your-helicone-api-key
   export OPENAI_API_KEY=your-openai-api-key
   ```

## Testing Levels

### 1. 🔧 **Unit Tests** (No API Keys Required)

Run the Jest test suite:

```bash
npm test
```

These tests verify:
- ✅ Provider creation and configuration
- ✅ Language model instantiation
- ✅ Error handling
- ✅ Type safety and interfaces
- ✅ Message conversion logic

### 2. 🧪 **Basic Functionality Tests** (No API Keys Required)

Test the provider structure and basic functionality:

```bash
npm run build
node test-manual.js
```

This verifies:
- ✅ Package builds correctly
- ✅ Provider implements V2 specification
- ✅ Model creation works
- ✅ Error handling is proper

### 3. 🚀 **Real API Tests** (Requires API Keys)

Test with actual Helicone and OpenAI APIs:

```bash
# Set your API keys first
export HELICONE_API_KEY=your-actual-helicone-key
export OPENAI_API_KEY=your-actual-openai-key

# Run the real API test
node test-real-api.js
```

This tests:
- ✅ Real HTTP requests through Helicone gateway
- ✅ Authentication with both Helicone and OpenAI
- ✅ Response parsing and error handling
- ✅ Helicone metadata and logging

### 4. 🔗 **Full AI SDK Integration** (Requires AI SDK + API Keys)

Test with the complete Vercel AI SDK:

```bash
# Install the AI SDK
npm install ai

# Run integration test
node test-with-ai-sdk.js
```

This tests:
- ✅ `generateText()` function integration
- ✅ `streamText()` function integration
- ✅ Helicone metadata and session tracking
- ✅ End-to-end workflow

## 🎯 **Quick Start Testing**

For a fast verification, run this sequence:

```bash
# 1. Build the package
npm run build

# 2. Basic functionality test
node test-manual.js

# 3. If you have API keys, test real API
# (Set HELICONE_API_KEY and OPENAI_API_KEY first)
node test-real-api.js
```

## 📊 **Testing Different Scenarios**

### Test Different Models

```bash
# Test with different OpenAI models
OPENAI_MODEL=gpt-4 node test-real-api.js
OPENAI_MODEL=gpt-3.5-turbo node test-real-api.js

# Test with Anthropic (requires ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=your-key node -e "
const { helicone } = require('./dist');
const provider = helicone({
  apiKey: process.env.HELICONE_API_KEY,
  providerApiKeys: { anthropic: process.env.ANTHROPIC_API_KEY }
});
console.log('Anthropic model:', provider.languageModel('anthropic/claude-3-haiku'));
"
```

### Test Helicone Features

```bash
# Test with session tracking
node -e "
const { helicone } = require('./dist');
const provider = helicone({
  apiKey: 'test',
  extraBody: {
    helicone: {
      sessionId: 'test-session-123',
      userId: 'test-user',
      properties: { test: true },
      tags: ['test']
    }
  }
});
console.log('✅ Helicone metadata configuration works');
"
```

### Test Error Scenarios

```bash
# Test invalid model format
node -e "
const { helicone } = require('./dist');
try {
  helicone().languageModel('invalid-format');
} catch (e) {
  console.log('✅ Error handling works:', e.message);
}
"

# Test missing API keys (will fail as expected)
node -e "
const { helicone } = require('./dist');
helicone().languageModel('openai/gpt-4').doGenerate({
  prompt: [{ role: 'user', content: [{ type: 'text', text: 'test' }] }]
}).catch(e => console.log('✅ Auth error handled:', e.message));
"
```

## 🐛 **Troubleshooting Tests**

### Common Issues

1. **"Cannot find name 'createHelicone'"**
   ```bash
   npm run build  # Rebuild the package
   ```

2. **"Module not found" errors**
   ```bash
   npm install  # Reinstall dependencies
   ```

3. **API authentication errors**
   ```bash
   # Check your API keys are set
   echo $HELICONE_API_KEY
   echo $OPENAI_API_KEY
   ```

4. **Network/timeout errors**
   ```bash
   # Test with longer timeout
   TIMEOUT=30000 node test-real-api.js
   ```

### Test in Different Environments

```bash
# Test with Node.js (current)
node test-manual.js

# Test as ES module
echo 'import("./test-manual.js")' | node --input-type=module

# Test TypeScript compilation
npx tsc --noEmit
```

## 📈 **Verifying Success**

After running tests, verify:

1. **Console Output**: All tests show ✅ green checkmarks
2. **Helicone Dashboard**: Visit [helicone.ai](https://helicone.ai) to see logged requests
3. **No Errors**: TypeScript compilation passes without errors
4. **Build Output**: `dist/` folder contains generated files

## 🚀 **Production Readiness**

Before using in production:

1. ✅ All unit tests pass
2. ✅ Real API tests work with your keys
3. ✅ Integration tests pass with AI SDK
4. ✅ Error handling works as expected
5. ✅ Helicone dashboard shows requests
6. ✅ TypeScript compilation is clean

The provider is ready for production use once all these tests pass! 🎉