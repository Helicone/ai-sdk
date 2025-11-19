import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createHelicone } from '../helicone-provider';
import { generateText, streamText } from 'ai';
import type { WithHeliconePrompt } from '../helpers';

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

// Helper to create a mock response
const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers(),
});

// Helper to get request body from mock call
const getRequestBody = (callIndex = 0) => {
  const call = mockFetch.mock.calls[callIndex];
  expect(call).toBeDefined();
  expect(call[1]).toBeDefined();
  return JSON.parse(call[1]?.body as string);
};

// Helper to get request headers from mock call
const getRequestHeaders = (callIndex = 0) => {
  const call = mockFetch.mock.calls[callIndex];
  expect(call).toBeDefined();
  expect(call[1]).toBeDefined();
  return call[1]?.headers;
};

describe('Helicone Prompts Integration', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key',
    });
  });

  describe('Using generateText with Prompts', () => {
    it('should include prompt_id and inputs when using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      const result = await generateText({
        model: helicone('gpt-4o', {
          promptId: 'customer_support_v1',
          inputs: { customer_name: 'Alice', issue_type: 'billing' },
          environment: 'staging',
        }),
        messages: [{ role: 'user', content: 'placeholder' }],
        temperature: 0.7,
      } as WithHeliconePrompt);

      expect(result.text).toBe('Test response');
      expect(result.usage.totalTokens).toBe(30);

      const requestBody = getRequestBody();
      expect(requestBody).toEqual({
        model: 'gpt-4o',
        stream: false,
        prompt_id: 'customer_support_v1',
        inputs: { customer_name: 'Alice', issue_type: 'billing' },
        environment: 'staging',
        temperature: 0.7,
      });
      expect(requestBody).not.toHaveProperty('messages');
    });

    it('should not include messages when using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      await generateText({
        model: helicone('gpt-4o', {
          promptId: 'test_prompt',
          inputs: { name: 'Test' },
        }),
        messages: [{ role: 'user', content: 'This should be ignored' }],
      } as WithHeliconePrompt);

      const requestBody = getRequestBody();
      expect(requestBody).not.toHaveProperty('messages');
      expect(requestBody).toHaveProperty('prompt_id', 'test_prompt');
      expect(requestBody).toHaveProperty('inputs', { name: 'Test' });
    });

    it('should use regular messages when not using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      await generateText({
        model: helicone('gpt-4o'),
        prompt: 'Hello',
      });

      const requestBody = getRequestBody();
      expect(requestBody).toHaveProperty('messages');
      expect(requestBody).not.toHaveProperty('prompt_id');
      expect(requestBody).not.toHaveProperty('inputs');
    });
  });

  describe('Integration with Helicone Features', () => {
    it('should work with prompts and helicone metadata', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      await generateText({
        model: helicone('gpt-4o', {
          promptId: 'test_prompt',
          inputs: { name: 'John' },
          extraBody: {
            helicone: {
              sessionId: 'session-123',
              userId: 'user-456',
              properties: { department: 'support' },
              tags: ['urgent', 'billing'],
            },
          },
        }),
        messages: [{ role: 'user', content: 'placeholder' }],
      } as WithHeliconePrompt);

      const headers = getRequestHeaders();
      expect(headers).toHaveProperty('Helicone-Session-Id', 'session-123');
      expect(headers).toHaveProperty('Helicone-User-Id', 'user-456');
      expect(headers).toHaveProperty('Helicone-Property-department', 'support');
      expect(headers).toHaveProperty('Helicone-Property-Tag-urgent', 'true');
      expect(headers).toHaveProperty('Helicone-Property-Tag-billing', 'true');

      const requestBody = getRequestBody();
      expect(requestBody).toHaveProperty('prompt_id', 'test_prompt');
      expect(requestBody).toHaveProperty('inputs', { name: 'John' });
    });
  });

  describe('Environment Handling', () => {
    it('should include environment in request when specified', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      await generateText({
        model: helicone('gpt-4o', {
          promptId: 'test_prompt',
          inputs: { name: 'Test' },
          environment: 'development',
        }),
        messages: [{ role: 'user', content: 'placeholder' }],
      } as WithHeliconePrompt);

      const requestBody = getRequestBody();
      expect(requestBody).toHaveProperty('environment', 'development');
    });

    it('should not include environment when not specified', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        id: 'test-id',
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      }) as any);

      await generateText({
        model: helicone('gpt-4o', {
          promptId: 'test_prompt',
          inputs: { name: 'Test' },
        }),
        messages: [{ role: 'user', content: 'placeholder' }],
      } as WithHeliconePrompt);

      const requestBody = getRequestBody();
      expect(requestBody).not.toHaveProperty('environment');
    });
  });

  describe('Streaming with Prompts', () => {
    it('should work with streamText and prompts', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode('data: {"id":"test","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
          controller.enqueue(encoder.encode('data: {"id":"test","choices":[{"delta":{},"finish_reason":"stop"}]}\n\n'));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream,
        headers: new Headers(),
      } as any);

      const result = streamText({
        model: helicone('gpt-4o', {
          promptId: 'test_prompt',
          inputs: { product_name: 'Test Product' },
        }),
        messages: [{ role: 'user', content: 'placeholder' }],
      } as WithHeliconePrompt);

      let text = '';
      for await (const chunk of result.textStream) {
        text += chunk;
      }

      expect(text).toBe('Hello');
      const requestBody = getRequestBody();
      expect(requestBody).toHaveProperty('prompt_id', 'test_prompt');
      expect(requestBody).toHaveProperty('inputs', { product_name: 'Test Product' });
      expect(requestBody.stream).toBe(true);
    });
  });
});
