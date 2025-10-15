import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = helicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  const prompt = 'Explain the concept of recursion in programming in simple terms.';

  console.log('Comparing responses from different providers...\n');

  console.log('=== Novita DeepSeek v3.1 Terminus ===');
  const openaiResult = await generateText({
    model: provider.languageModel("deepseek-v3.1-terminus/novita"),
    prompt,
    maxOutputTokens: 150,
  });
  console.log(openaiResult.text);
  console.log(`Tokens: ${(openaiResult.usage.inputTokens ?? 0) + (openaiResult.usage.outputTokens ?? 0)}\n`);

  console.log('=== Anthropic Claude 4.5 Sonnet ===');
  const anthropicResult = await generateText({
    model: provider.languageModel("claude-4.5-sonnet/anthropic"),
    prompt,
    maxOutputTokens: 150,
  });
  console.log(anthropicResult.text);
  console.log(`Tokens: ${(anthropicResult.usage.inputTokens ?? 0) + (anthropicResult.usage.outputTokens ?? 0)}\n`);
}

main().catch(console.error);
