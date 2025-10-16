import { helicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const gateway = helicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  console.log('Testing tool calling with Helicone...\n');

  // Note: Due to a current limitation in AI SDK v5's schema conversion,
  // we pass tools directly in the extraBody to ensure proper JSON Schema format
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
        },
        tools: [
          {
            type: 'function',
            function: {
              name: 'getWeather',
              description: 'Get the current weather for a location',
              parameters: {
                type: 'object',
                properties: {
                  location: {
                    type: 'string',
                    description: 'The city and state, e.g. San Francisco, CA'
                  },
                  unit: {
                    type: 'string',
                    enum: ['celsius', 'fahrenheit'],
                    description: 'Temperature unit'
                  }
                },
                required: ['location']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'calculate',
              description: 'Perform a mathematical calculation',
              parameters: {
                type: 'object',
                properties: {
                  operation: {
                    type: 'string',
                    enum: ['add', 'subtract', 'multiply', 'divide'],
                    description: 'The mathematical operation to perform'
                  },
                  a: {
                    type: 'number',
                    description: 'First number'
                  },
                  b: {
                    type: 'number',
                    description: 'Second number'
                  }
                },
                required: ['operation', 'a', 'b']
              }
            }
          }
        ],
        tool_choice: 'auto'
      }
    }),
    prompt: 'What is the weather like in San Francisco? Also, what is 42 multiplied by 17?'
  });

  console.log('=== Response ===');
  console.log(result.text || '(Tool calls were made - check Helicone dashboard for details)');

  console.log('\n=== Request Info ===');
  console.log(`Total tokens used: ${result.usage.totalTokens}`);
  console.log(`Finish reason: ${result.finishReason}`);

  console.log('\n✓ Tool calling request sent successfully!');
  console.log('Check your Helicone dashboard to see:');
  console.log('  - Tool definitions that were sent');
  console.log('  - Any tool calls made by the model');
  console.log('  - Session tracking with custom properties and tags');
}

main().catch(console.error);
