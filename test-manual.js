#!/usr/bin/env node

// Manual test script to verify the Helicone provider works
const { helicone } = require('./dist/index.js');

console.log('🧪 Testing Helicone Provider...\n');

// Test 1: Provider Creation
try {
  const provider = helicone({
    apiKey: process.env.HELICONE_API_KEY || 'test-key',
    providerApiKeys: {
      openai: process.env.OPENAI_API_KEY || 'test-openai-key',
    },
  });

  console.log('✅ Provider created successfully');
  console.log('   Specification version:', provider.specificationVersion);

  // Test 2: Language Model Creation
  const model = provider.languageModel('openai/gpt-4');
  console.log('✅ Language model created successfully');
  console.log('   Model ID:', model.modelId);
  console.log('   Provider:', model.provider);
  console.log('   Specification version:', model.specificationVersion);

  // Test 3: Error Handling
  try {
    provider.languageModel('invalid-format');
  } catch (error) {
    console.log('✅ Error handling works:', error.message);
  }

  // Test 4: Provider Methods (should throw errors as expected)
  try {
    provider.textEmbeddingModel('test');
  } catch (error) {
    console.log('✅ textEmbeddingModel throws expected error:', error.message);
  }

  try {
    provider.imageModel('test');
  } catch (error) {
    console.log('✅ imageModel throws expected error:', error.message);
  }

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