import { helicone } from '@helicone/ai-sdk-provider';
import { generateText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

async function main() {
  const gateway = helicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  console.log('Testing tool calling with Helicone...\n');

  const result = await generateText({
    model: gateway.languageModel('gpt-4o-mini', {
      extraBody: {
        helicone: {
          sessionId: 'tool-calling-demo-' + Date.now(),
          properties: {
            example: 'tool-calling',
            feature: 'function-tools'
          },
          tags: ['tools', 'demo']
        }
      }
    }),
    prompt: 'What is the weather like in San Francisco? Also, what is 42 multiplied by 17?',
    tools: {
      getWeather: tool({
        description: 'Get the current weather for a location',
        parameters: z.object({
          location: z.string().describe('The city and state, e.g. San Francisco, CA'),
          unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit')
        })
      } as any),
      calculate: tool({
        description: 'Perform a mathematical calculation',
        parameters: z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The mathematical operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number')
        })
      } as any)
    },
    maxRetries: 5
  });

  console.log('\n=== Response ===');
  console.log(result.text || '(Model requested tool calls)');

  console.log('\n=== Request Info ===');
  console.log(`Total tokens: ${result.usage.totalTokens}`);
  console.log(`Finish reason: ${result.finishReason}`);

  if (result.finishReason === 'tool-calls') {
    console.log('\n✓ Tool calling works! The model requested to use the defined tools.');
    console.log('Check your Helicone dashboard to see:');
    console.log('  - Tool definitions sent to the API');
    console.log('  - Tool calls requested by the model');
    console.log('  - Session tracking with custom properties and tags');
  } else {
    console.log('\n✓ Request completed successfully!');
  }
}

main().catch(console.error);
