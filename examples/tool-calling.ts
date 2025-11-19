import { createHelicone } from '@helicone/ai-sdk-provider';
import { generateText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

async function main() {
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY
  });

  console.log('Testing tool calling with Helicone...\n');
  console.log('This example shows how generateText handles tool definitions.');
  console.log('The model receives tool specs and returns tool call requests,');
  console.log('but generateText does NOT execute them automatically.');
  console.log('\nFor automatic tool execution, see stream-tool-calling.ts\n');

  // Basic tool calling example
  const result = await generateText({
    model: helicone('gpt-4o-mini', {
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
        inputSchema: z.object({
          location: z.string().describe('The city and state, e.g. San Francisco, CA'),
          unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit')
        })
      }),
      calculate: tool({
        description: 'Perform a mathematical calculation',
        inputSchema: z.object({
          operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The mathematical operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number')
        })
      })
    }
  });

  console.log('\n=== Response ===');
  console.log('Finish reason:', result.finishReason);
  console.log('Total tokens:', result.usage.totalTokens);
  console.log('Steps:', result.steps.length);

  if (result.toolCalls && result.toolCalls.length > 0) {
    console.log('\nTool Calls Requested by Model:');
    result.toolCalls.forEach((call, i) => {
      console.log(`  ${i + 1}. ${call.toolName}`);
    });
    console.log('\nNote: These tool calls were NOT executed.');
    console.log('generateText only returns the tool call requests.');
  }

  if (result && result.finishReason !== 'error' && result.finishReason !== 'other') {
    console.log('\n✓ Tool definitions sent successfully!');
    console.log('✓ Model understood and requested appropriate tools.');

    console.log('\nCheck your Helicone dashboard to see:');
    console.log('  - Tool definitions in the request');
    console.log('  - Tool call requests in the response');
    console.log('  - Request metadata (session ID, properties, tags)');

    console.log('\n💡 To actually execute tools and get final text responses:');
    console.log('   Use streamText (see examples/stream-tool-calling.ts)');
  }
}

main().catch(console.error);
