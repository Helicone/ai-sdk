#!/usr/bin/env tsx

/**
 * This example demonstrates how to use Helicone prompts integration with the AI SDK.
 *
 * Prerequisites:
 * 1. Set your HELICONE_API_KEY environment variable
 * 2. Create prompts in your Helicone dashboard at https://helicone.ai/prompts
 * 3. Replace the prompt_id values below with your actual prompt IDs
 */

import 'dotenv/config';
import { helicone } from '../src';
import type { WithHeliconePrompt } from '../src';
import { generateText, streamText } from 'ai';

const gateway = helicone({
  apiKey: process.env.HELICONE_API_KEY!,
});

async function basicPromptExample() {
  console.log('\n=== Basic Prompt Example ===');

  try {
    const result = await generateText({
      model: gateway.languageModel("gpt-4o", {
        promptId: "ec771n", // Get this from your Helicone dashboard after saving your prompt
        inputs: {
          customer_name: "Sarah Johnson",
          issue_type: "billing",
          account_type: "premium",
        },
        environment: "production", // optional, defaults to 'production'
        extraBody: {
          helicone: {
            sessionId: "support-session-123",
            userId: "user-456",
            properties: {
              department: "customer-support",
              priority: "high",
            },
            tags: ["billing", "urgent"],
          },
        },
      }),
      messages: [{ role: "user", content: "placeholder" }], // Required by AI SDK, ignored when using promptId
    } as WithHeliconePrompt);

    console.log('Response:', result.text);
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function streamingPromptExample() {
  console.log('\n=== Streaming Prompt Example ===');

  try {
    const result = await streamText({
      model: gateway.languageModel("gpt-4o", {
        promptId: "eKnmBR", // Get this from your Helicone dashboard after saving your prompt
        inputs: {
          product_name: "Smart Fitness Watch",
          key_features: [
            "heart rate monitoring",
            "GPS tracking",
            "7-day battery",
          ],
          target_audience: "fitness enthusiasts",
          tone: "professional but friendly",
        },
        extraBody: {
          helicone: {
            properties: {
              use_case: "marketing",
              content_type: "product_description",
            },
          },
        },
      }),
      messages: [{ role: "user", content: "placeholder" }], // Required by AI SDK, ignored when using promptId
    } as WithHeliconePrompt);

    console.log('Streaming response:');
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    console.log('\n');

    // Get final usage statistics
    const finalResult = await result.text;
    console.log('Final result:', finalResult);
    console.log('Final usage:', result.usage);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function multipleEnvironmentsExample() {
  console.log('\n=== Multiple Environments Example ===');

  // Test with different environments
  const environments = ['development', 'staging', 'production'] as const;

  for (const env of environments) {
    try {
      console.log(`\n--- Testing ${env} environment ---`);

      const result = await generateText({
        model: gateway.languageModel("gpt-4o", {
          promptId: "TytZ2G", // Get this from your Helicone dashboard after saving your prompt
          inputs: {
            user_name: "Alex",
            time_of_day: "morning",
          },
          environment: env,
          extraBody: {
            helicone: {
              properties: {
                environment: env,
                test_run: true,
              },
            },
          },
        }),
        messages: [{ role: "user", content: "placeholder" }], // Required by AI SDK, ignored when using promptId
      } as WithHeliconePrompt);

      console.log(`${env} response:`, result.text);
    } catch (error) {
      console.error(`Error in ${env}:`, error);
    }
  }
}

async function regularMessagesExample() {
  console.log('\n=== Regular Messages (No Prompts) Example ===');

  try {
    // This shows that regular AI SDK usage still works
    const result = await generateText({
      model: gateway.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'regular-session-789',
            properties: {
              usage_type: 'direct_message'
            }
          }
        }
      }),
      prompt: 'Write a haiku about artificial intelligence and creativity.',
    });

    console.log('Haiku:', result.text);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function promptWithToolsExample() {
  console.log('\n=== Prompt with Tools Example ===');

  try {
    const result = await generateText({
      model: gateway.languageModel("gpt-4o", {
        promptId: "g2voao", // Get this from your Helicone dashboard after saving your prompt
        inputs: {
          location: "San Francisco, CA",
        },
        extraBody: {
          helicone: {
            properties: {
              feature: "weather_tools",
              integration: "openweather",
            },
          },
        },
      }),
      messages: [{ role: "user", content: "placeholder" }], // Required by AI SDK, ignored when using promptId
      tools: {
        getWeather: {
          description: "Get current weather for a location",
          parameters: {
            type: "object",
            properties: {
              location: {
                type: "string",
                description: "The city and state/country",
              },
            },
            required: ["location"],
          },
        } as any,
      },
    } as WithHeliconePrompt);

    console.log('Weather response:', result.text);

    // Show tool calls if any
    if (result.toolCalls && result.toolCalls.length > 0) {
      console.log('Tool calls made:');
      result.toolCalls.forEach((call: any, index: number) => {
        console.log(`${index + 1}. ${call.toolName}:`, call.args || call.input);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run all examples
async function main() {
  console.log('🚀 Helicone Prompts Integration Examples');
  console.log('==========================================');

  if (!process.env.HELICONE_API_KEY) {
    console.error('❌ Please set your HELICONE_API_KEY environment variable');
    process.exit(1);
  }

  // Run examples sequentially
  await basicPromptExample();
  await streamingPromptExample();
  await multipleEnvironmentsExample();
  await regularMessagesExample();
  await promptWithToolsExample();

  console.log('\n✅ All examples completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Create your own prompts in the Helicone dashboard');
  console.log('2. Replace the prompt IDs in this example with your own');
  console.log('3. Experiment with different inputs and environments');
}

main().catch(console.error);
