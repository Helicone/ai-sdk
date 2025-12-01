import { createHelicone } from '@helicone/ai-sdk-provider';
import { streamText } from 'ai';
import dotenv from 'dotenv';

dotenv.config();

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY
});

const getBaseHeliconeProperties = (context: any) => ({
  userId: context?.userId || 'test-user',
  sessionId: context?.sessionId || 'test-session',
});

export function uiMessageStreamResponseCheck() {
  const context = {
    userId: 'customer-123',
    sessionId: 'support-session-456'
  };

  const result = streamText({
    model: helicone('gpt-4o-mini', {
      extraBody: {
        helicone: {
          ...getBaseHeliconeProperties(context),
          tags: ['post-processor', 'channel-tone', 'stream'],
        },
      },
    }),
    system: 'You are a customer support assistant.',
    prompt: 'Provide a professional response about billing assistance.',
    experimental_telemetry: {
      isEnabled: true,
      recordInputs: true,
      recordOutputs: true,
    },
    headers: {
      'Helicone-Session-Path': 'ai-v4/post-processor/channel-tone',
    },
  });

  // This is what customers should return from API routes
  const streamResponse = result.toUIMessageStreamResponse();

  console.log('✅ Created streaming response for API route');
  console.log('Response headers:', Object.fromEntries(streamResponse.headers.entries()));
  console.log('✅ Ready to return from API endpoint!\n');

  return streamResponse;
}

uiMessageStreamResponseCheck();
