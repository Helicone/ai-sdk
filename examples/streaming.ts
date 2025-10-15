import { helicone } from '@helicone/ai-sdk-provider';
import { streamText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const provider = helicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  console.log('Streaming response...\n');

  const result = await streamText({
    model: provider.languageModel('gpt-4o-mini'),
    prompt: 'Write a short story about a robot learning to paint',
    maxOutputTokens: 300,
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  console.log('\n\nStream completed!');
}

main().catch(console.error);
