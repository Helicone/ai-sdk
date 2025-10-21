#!/usr/bin/env node

// Manual test script to verify the Helicone provider works
import { createHelicone } from './dist/index.js';

console.log('🧪 Testing Helicone Provider...\n');

// Test 1: Provider Creation
try {
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY || 'test-key'
  });

  console.log('✅ Provider function created successfully');
  console.log('   Type:', typeof helicone);

  // Test 2: Language Model Creation
  const model = helicone('openai/gpt-4');
  console.log('✅ Language model created successfully');
  console.log('   Model ID:', model.modelId);
  console.log('   Provider:', model.provider);
  console.log('   Specification version:', model.specificationVersion);

  // Test 3: Different Model Creation
  const model2 = helicone('claude-3.5-sonnet');
  console.log('✅ Second model created successfully');
  console.log('   Model ID:', model2.modelId);
  console.log('   Provider:', model2.provider);

  console.log('\n🎉 All basic tests passed! The provider is working correctly.');
  console.log('\n💡 To test with real API calls, set these environment variables:');
  console.log('   HELICONE_API_KEY=your-helicone-api-key');
  console.log('   OPENAI_API_KEY=your-openai-api-key');
  console.log('   Then run: node test-real-api.js');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
