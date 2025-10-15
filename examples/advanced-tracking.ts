import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

async function main() {
  const provider = helicone({
    apiKey: process.env.HELICONE_API_KEY,
    providerApiKeys: {
      openai: process.env.OPENAI_API_KEY!,
    },
  });

  // Example of advanced tracking with session, user, and custom properties
  const result = await generateText({
    model: provider.languageModel('gpt-4o', {
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

  console.log('\nRequest metadata:');
  console.log('- Session ID: demo-session-' + Date.now());
  console.log('- User ID: user-12345');
  console.log('- Tags: demo, tutorial, programming');
  console.log('- Caching: enabled');
  console.log('- Custom properties: environment, feature, version, language');
}

main().catch(console.error);
