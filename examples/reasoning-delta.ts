import { createHelicone } from '@helicone/ai-sdk-provider';
import { streamText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example demonstrating reasoning-delta support with OpenAI o1 models
 *
 * OpenAI o1 models can return reasoning tokens that show the model's
 * internal thinking process. This example shows how to capture
 * reasoning-delta events from the stream.
 *
 * Note: This example demonstrates raw reasoning-delta events.
 * For complete lifecycle management with reasoning-start and reasoning-end,
 * see the auto-text-events feature.
 */
async function main() {
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
  });

  console.log('🤔 Streaming with reasoning-delta support...\n');
  console.log('='.repeat(60));

  const result = await streamText({
    model: helicone('gpt-5-mini'), // Use OpenAI model with reasoning
    prompt: 'Explain step by step why the sky appears blue during the day.',
    maxOutputTokens: 500,
  });

  let reasoningContent = '';
  let textContent = '';

  // Stream and capture reasoning-delta events
  for await (const chunk of result.fullStream) {
    switch (chunk.type) {
      case 'reasoning-delta':
        console.log(`💭 [REASONING] ${chunk.text}`);
        reasoningContent += chunk.text;
        break;

      case 'text-delta':
        console.log(`📝 [TEXT] ${chunk.text}`);
        textContent += chunk.text;
        break;

      case 'finish':
        console.log('\n✅ Stream completed!');
        console.log('\n📊 USAGE STATS:');
        console.log(`   Input tokens: ${chunk.totalUsage.inputTokens}`);
        console.log(`   Output tokens: ${chunk.totalUsage.outputTokens}`);
        console.log(`   Total tokens: ${chunk.totalUsage.totalTokens}`);
        console.log(`   Finish reason: ${chunk.finishReason.toString()}`);
        break;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📈 SUMMARY:');
  console.log(`   Reasoning length: ${reasoningContent.length} chars`);
  console.log(`   Answer length: ${textContent.length} chars`);
  console.log('\n💡 Note: For automatic start/end events, use the auto-text-events feature.');
}

main().catch(console.error);
