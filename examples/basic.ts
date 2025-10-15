import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  // Initialize the Helicone provider
  const gateway = helicone({
    apiKey: process.env.HELICONE_API_KEY!
  });

  const result = await generateText({
    model: gateway.languageModel("claude-3.7-sonnet"),
    prompt: "Write a haiku about artificial intelligence",
  });

  console.log('Generated haiku:');
  console.log(result.text);
}

main().catch(console.error);
