import { createHelicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  // Example of advanced tracking with session, user, and custom properties
  const result = await generateText({
    model: helicone('gpt-4o', {
      extraBody: {
        helicone: {
          sessionId: 'demo-session-' + Date.now(),
          userId: 'user-12345',
          properties: {
            environment: 'development',
            feature: 'code-explanation',
            version: '1.0.0',
            language: 'typescript',
          },
          tags: ['demo', 'tutorial', 'programming'],
          cache: true, // Enable caching
        },
      },
    }),
    prompt: 'Explain how async/await works in JavaScript with a simple example.',
    maxOutputTokens: 200,
  });

  console.log('Generated explanation:');
  console.log(result.text);
}

main().catch(console.error);
