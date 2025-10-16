#!/usr/bin/env node

// Test with actual Vercel AI SDK integration
// Run: npm install ai && node test-with-ai-sdk.js

async function testWithAISDK() {
  console.log('🔗 Testing Helicone Provider with Vercel AI SDK...\n');

  try {
    // Import the AI SDK (user needs to install it)
    const { generateText, streamText } = await import('ai').catch(() => {
      console.error('❌ Please install the AI SDK first: npm install ai');
      process.exit(1);
    });

    const { helicone } = require('./dist/index.js');

    // Check for API keys
    if (!process.env.HELICONE_API_KEY || !process.env.OPENAI_API_KEY) {
      console.error('❌ Required environment variables:');
      console.error('   HELICONE_API_KEY=your-helicone-api-key');
      console.error('   OPENAI_API_KEY=your-openai-api-key');
      process.exit(1);
    }

    const provider = helicone({
      apiKey: process.env.HELICONE_API_KEY
    });

    // Test 1: Generate Text
    console.log('📝 Test 1: Generate Text');
    const result = await generateText({
      model: provider.languageModel('openai/gpt-3.5-turbo'),
      prompt: 'Write a haiku about TypeScript',
      maxTokens: 100,
    });

    console.log('✅ Generate text successful!');
    console.log('   Response:', result.text);
    console.log('   Usage:', result.usage);

    // Test 2: Streaming
    console.log('\n🌊 Test 2: Streaming Text');
    const stream = await streamText({
      model: provider.languageModel('openai/gpt-3.5-turbo'),
      prompt: 'Count from 1 to 5 slowly',
      maxTokens: 50,
    });

    console.log('✅ Streaming started...');
    let streamedText = '';
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      streamedText += chunk;
    }

    console.log('\n✅ Streaming completed!');
    console.log('   Full text length:', streamedText.length);

    // Test 3: With Helicone metadata
    console.log('\n🏷️  Test 3: With Helicone Metadata');
    const resultWithMeta = await generateText({
      model: provider.languageModel('openai/gpt-3.5-turbo', {
        extraBody: {
          helicone: {
            sessionId: 'test-session-' + Date.now(),
            userId: 'test-user',
            properties: {
              testType: 'integration-test',
              feature: 'metadata-tracking',
            },
            tags: ['integration', 'test', 'metadata'],
          },
        },
      }),
      prompt: 'Say "Metadata test successful!"',
    });

    console.log('✅ Metadata test successful!');
    console.log('   Response:', resultWithMeta.text);

    console.log('\n🎉 All AI SDK integration tests passed!');
    console.log('💡 Check your Helicone dashboard to see all logged requests.');

  } catch (error) {
    console.error('❌ AI SDK integration test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testWithAISDK();
