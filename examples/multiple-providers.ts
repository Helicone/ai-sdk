import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

async function main() {
  const provider = helicone({
    apiKey: process.env.HELICONE_API_KEY,
    providerApiKeys: {
      openai: process.env.OPENAI_API_KEY!,
      anthropic: process.env.ANTHROPIC_API_KEY!,
    },
  });

  const prompt = 'Explain the concept of recursion in programming in simple terms.';

  console.log('Comparing responses from different providers...\n');

  // OpenAI GPT-4o
  console.log('=== OpenAI GPT-4o ===');
  const openaiResult = await generateText({
    model: provider.languageModel('gpt-4o'),
    prompt,
    maxOutputTokens: 150,
  });
  console.log(openaiResult.text);
  console.log(`Tokens: ${(openaiResult.usage.inputTokens ?? 0) + (openaiResult.usage.outputTokens ?? 0)}\n`);

  // Anthropic Claude
  console.log('=== Anthropic Claude 3.5 Haiku ===');
  const anthropicResult = await generateText({
    model: provider.languageModel('claude-3.5-haiku'),
    prompt,
    maxOutputTokens: 150,
  });
  console.log(anthropicResult.text);
  console.log(`Tokens: ${(anthropicResult.usage.inputTokens ?? 0) + (anthropicResult.usage.outputTokens ?? 0)}\n`);
}

main().catch(console.error);
