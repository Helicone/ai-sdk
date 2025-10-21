#!/usr/bin/env node

// Real API test - requires actual API keys
import { createHelicone } from './dist/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRealAPI() {
  console.log('🚀 Testing Helicone Provider with Real API...\n');

  // Check for required environment variables
  if (!process.env.HELICONE_API_KEY) {
    console.error('❌ HELICONE_API_KEY environment variable is required');
    console.log('   Get your key from: https://helicone.ai');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    console.log('   Get your key from: https://platform.openai.com/api-keys');
    process.exit(1);
  }

  try {
    // Initialize the provider
    const helicone = createHelicone({
      apiKey: process.env.HELICONE_API_KEY,
      extraBody: {
        helicone: {
          properties: {
            test: 'helicone-provider-test',
            timestamp: new Date().toISOString()
          },
          tags: ['test', 'provider-validation']
        }
      }
    });

    console.log('✅ Provider initialized with real API keys');

    // Test with a simple generation
    const model = helicone('openai/gpt-3.5-turbo');

    // Mock the generateText function since we don't have 'ai' package in dependencies
    // In real usage, you would import this from 'ai'
    console.log('📝 Attempting to generate text...');
    console.log('   Model:', model.modelId);
    console.log('   Provider:', model.provider);

    // Test the doGenerate method directly
    const result = await model.doGenerate({
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Say "Hello from Helicone!" in exactly those words.' }],
        },
      ],
      temperature: 0.1,
      maxOutputTokens: 50,
    });

    console.log('✅ Generation successful!');
    console.log('   Response:', result.text);
    console.log('   Finish reason:', result.finishReason);
    console.log('   Usage:', result.usage);

    console.log('\n🎉 Real API test completed successfully!');
    console.log('💡 Check your Helicone dashboard to see the logged request.');

  } catch (error) {
    console.error('❌ Real API test failed:', error.message);
    console.error('   Error details:', error);

    if (error.response) {
      console.error('   HTTP Status:', error.response.status);
      try {
        const responseText = await error.response.clone().text();
        console.error('   Response body:', responseText);
      } catch (e) {
        console.error('   Unable to read response body');
      }
    }

    if (error.data) {
      console.error('   Error data:', JSON.stringify(error.data, null, 2));
    }

    process.exit(1);
  }
}

testRealAPI();
