import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createHelicone } from '../helicone-provider';
import { streamText, validateUIMessages, Experimental_Agent as Agent, stepCountIs } from 'ai';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const createMockStreamResponse = (chunks: any[]) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach(chunk => {
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return {
    ok: true,
    body: stream,
    headers: new Headers(),
  };
};

const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers(),
});

describe('UI Message Stream Response', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key',
    });
  });

  describe('toUIMessageStreamResponse()', () => {
    it('should create a Response object with correct headers', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'Hello' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const result = streamText({
        model: helicone('gpt-4o-mini', {
          extraBody: {
            helicone: {
              tags: ['simple-stream-test'],
              properties: {
                test: 'toUIMessageStreamResponse',
              },
            },
          },
        }),
        prompt: 'Say "Hello streaming world!"',
      });

      const response = result.toUIMessageStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers).toBeInstanceOf(Headers);
      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it('should work with ui-message-response-check.ts example pattern', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'I' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: ' can' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: ' help' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const getBaseHeliconeProperties = (context: any) => ({
        userId: context?.userId || 'test-user',
        sessionId: context?.sessionId || 'test-session',
      });

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

      const streamResponse = result.toUIMessageStreamResponse();

      expect(streamResponse).toBeInstanceOf(Response);
      expect(streamResponse.headers).toBeInstanceOf(Headers);
      expect(streamResponse.body).toBeInstanceOf(ReadableStream);

      const reader = streamResponse.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs[1]).toBeDefined();
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers).toBeDefined();

      expect(headers['Helicone-Session-Id']).toBe('support-session-456');
      expect(headers['Helicone-User-Id']).toBe('customer-123');
      expect(headers['Helicone-Property-Tag-post-processor']).toBe('true');
      expect(headers['Helicone-Property-Tag-channel-tone']).toBe('true');
      expect(headers['Helicone-Property-Tag-stream']).toBe('true');
    });

    it('should preserve custom headers in the response', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'Test' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const result = streamText({
        model: helicone('gpt-4o-mini'),
        prompt: 'Test',
        headers: {
          'Custom-Header': 'custom-value',
          'Another-Header': 'another-value',
        },
      });

      const response = result.toUIMessageStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.headers).toBeInstanceOf(Headers);
    });

    it('should handle streaming with experimental_telemetry', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'Telemetry' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const result = streamText({
        model: helicone('gpt-4o-mini', {
          extraBody: {
            helicone: {
              sessionId: 'telemetry-test',
            },
          },
        }),
        prompt: 'Test telemetry',
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });

      const response = result.toUIMessageStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBeInstanceOf(ReadableStream);
    });

    it('should create response that can be consumed as a stream', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'Stream' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: ' content' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const result = streamText({
        model: helicone('gpt-4o-mini'),
        prompt: 'Stream test',
      });

      const response = result.toUIMessageStreamResponse();

      expect(response.body).toBeInstanceOf(ReadableStream);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let chunks: string[] = [];

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should work with Helicone metadata and toUIMessageStreamResponse together', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: { content: 'Metadata' },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'stop'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

      const result = streamText({
        model: helicone('gpt-4o-mini', {
          extraBody: {
            helicone: {
              sessionId: 'ui-stream-session',
              userId: 'ui-stream-user',
              properties: {
                feature: 'ui-message-stream',
                version: '1.0.0',
              },
              tags: ['ui', 'stream', 'test'],
            },
          },
        }),
        prompt: 'Test with metadata',
      });

      const response = result.toUIMessageStreamResponse();

      expect(response).toBeInstanceOf(Response);
      expect(response.body).toBeInstanceOf(ReadableStream);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs[1]).toBeDefined();
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers).toBeDefined();

      expect(headers['Helicone-Session-Id']).toBe('ui-stream-session');
      expect(headers['Helicone-User-Id']).toBe('ui-stream-user');
      expect(headers['Helicone-Property-feature']).toBe('ui-message-stream');
      expect(headers['Helicone-Property-version']).toBe('1.0.0');
      expect(headers['Helicone-Property-Tag-ui']).toBe('true');
      expect(headers['Helicone-Property-Tag-stream']).toBe('true');
      expect(headers['Helicone-Property-Tag-test']).toBe('true');
    });
  });

  describe('validateUIMessages with Helicone', () => {
    let helicone: ReturnType<typeof createHelicone>;

    beforeEach(() => {
      jest.clearAllMocks();
      helicone = createHelicone({
        apiKey: 'test-key',
      });
    });

    it('should work with validateUIMessages and Agent pattern', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{
          message: {
            role: 'assistant',
            content: 'Hello! I can help you understand how validateUIMessages works.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 25,
          completion_tokens: 15,
          total_tokens: 40
        }
      }) as any);

      const myAgent = new Agent({
        model: helicone('gpt-4o-mini', {
          extraBody: {
            helicone: {
              sessionId: 'validate-ui-messages-test-' + Date.now(),
              properties: {
                app: 'demo',
                example: 'validate-ui-messages',
              },
              tags: ['agent', 'validate-ui-messages', 'api-route'],
            },
          },
        }),
        instructions: 'You are a helpful assistant. Keep responses concise and friendly.',
        stopWhen: stepCountIs(3),
      });

      const simulatedUIMessages = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello! Can you help me understand how validateUIMessages works?' }],
        },
      ];

      const validatedMessages = await validateUIMessages({
        messages: simulatedUIMessages,
      });

      expect(validatedMessages).toBeDefined();
      expect(Array.isArray(validatedMessages)).toBe(true);
      expect(validatedMessages.length).toBe(1);
      expect(validatedMessages[0].role).toBe('user');
      expect(validatedMessages[0].parts).toBeDefined();
      expect(Array.isArray(validatedMessages[0].parts)).toBe(true);

      function messagesToPrompt(messages: Awaited<ReturnType<typeof validateUIMessages>>): string {
        return messages
          .map((msg) => {
            const parts = msg.parts
              .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
              .map((part) => part.text)
              .join('');
            return `${msg.role}: ${parts}`;
          })
          .join('\n');
      }

      const prompt = messagesToPrompt(validatedMessages);
      expect(prompt).toContain('user:');
      expect(prompt).toContain('Hello! Can you help me understand how validateUIMessages works?');

      const response = await myAgent.generate({
        prompt,
      });

      expect(response.text).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs[1]).toBeDefined();
      const headers = callArgs[1]?.headers as Record<string, string>;
      expect(headers).toBeDefined();

      expect(headers['Helicone-Session-Id']).toBeDefined();
      expect(headers['Helicone-Property-app']).toBe('demo');
      expect(headers['Helicone-Property-example']).toBe('validate-ui-messages');
      expect(headers['Helicone-Property-Tag-agent']).toBe('true');
      expect(headers['Helicone-Property-Tag-validate-ui-messages']).toBe('true');
      expect(headers['Helicone-Property-Tag-api-route']).toBe('true');
    });

    it('should handle conversation history with validateUIMessages', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{
          message: {
            role: 'assistant',
            content: 'The capital of Germany is Berlin.'
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 10,
          total_tokens: 40
        }
      }) as any);

      const myAgent = new Agent({
        model: helicone('gpt-4o-mini', {
          extraBody: {
            helicone: {
              sessionId: 'conversation-test',
              properties: {
                app: 'demo',
              },
            },
          },
        }),
        instructions: 'You are a helpful assistant.',
        stopWhen: stepCountIs(3),
      });

      const conversationMessages = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [{ type: 'text', text: "What's the capital of France?" }],
        },
        {
          id: 'msg-2',
          role: 'assistant',
          parts: [{ type: 'text', text: 'The capital of France is Paris.' }],
        },
        {
          id: 'msg-3',
          role: 'user',
          parts: [{ type: 'text', text: 'And what about Germany?' }],
        },
      ];

      const validatedMessages = await validateUIMessages({
        messages: conversationMessages,
      });

      expect(validatedMessages.length).toBe(3);
      expect(validatedMessages[0].role).toBe('user');
      expect(validatedMessages[1].role).toBe('assistant');
      expect(validatedMessages[2].role).toBe('user');

      function messagesToPrompt(messages: Awaited<ReturnType<typeof validateUIMessages>>): string {
        return messages
          .map((msg) => {
            const parts = msg.parts
              .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
              .map((part) => part.text)
              .join('');
            return `${msg.role}: ${parts}`;
          })
          .join('\n');
      }

      const prompt = messagesToPrompt(validatedMessages);
      const response = await myAgent.generate({
        prompt,
      });

      expect(response.text).toBeDefined();
    });

    it('should validate UI messages with multiple text parts', async () => {
      const messagesWithMultipleParts = [
        {
          id: 'msg-1',
          role: 'user',
          parts: [
            { type: 'text', text: 'Hello, ' },
            { type: 'text', text: 'how are you?' },
          ],
        },
      ];

      const validatedMessages = await validateUIMessages({
        messages: messagesWithMultipleParts,
      });

      expect(validatedMessages.length).toBe(1);
      expect(validatedMessages[0].parts.length).toBe(2);
      expect(validatedMessages[0].parts[0].type).toBe('text');
      expect(validatedMessages[0].parts[1].type).toBe('text');
    });

    it('should validate UI messages with reasoning parts', async () => {
      const messagesWithReasoning = [
        {
          id: 'msg-1',
          role: 'assistant',
          parts: [
            { type: 'reasoning', text: 'Let me think about this...' },
            { type: 'text', text: 'Here\'s my response.' },
          ],
        },
      ];

      const validatedMessages = await validateUIMessages({
        messages: messagesWithReasoning,
      });

      expect(validatedMessages.length).toBe(1);
      expect(validatedMessages[0].parts.length).toBe(2);
      expect(validatedMessages[0].parts[0].type).toBe('reasoning');
      expect(validatedMessages[0].parts[1].type).toBe('text');
    });
  });
});

