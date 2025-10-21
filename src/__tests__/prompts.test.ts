import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { HeliconeProvider } from '../helicone-provider';
import { HeliconeLanguageModel } from '../helicone-language-model';

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
});

// Helper to get request body from mock call
const getRequestBody = (callIndex = 0) => {
  const call = mockFetch.mock.calls[callIndex];
  return JSON.parse((call[1] as any).body);
};

// Helper to get request headers from mock call
const getRequestHeaders = (callIndex = 0) => {
  const call = mockFetch.mock.calls[callIndex];
  return (call[1] as any).headers;
};

describe('Helicone Prompts Integration', () => {
  let provider: HeliconeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HeliconeProvider({
      apiKey: 'test-key',
    });
  });

  describe('Provider Configuration', () => {
    it('should create language model with prompt parameters', () => {
      const model = provider.languageModel('gpt-4o', {
        promptId: 'test_prompt',
        inputs: { user_name: 'John' },
        environment: 'development',
      });

      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect((model as any).extraBody).toEqual({
        prompt_id: 'test_prompt',
        inputs: { user_name: 'John' },
        environment: 'development',
      });
    });

    it('should merge prompt parameters with existing extraBody', () => {
      const model = provider.languageModel('gpt-4o', {
        promptId: 'test_prompt',
        inputs: { user_name: 'John' },
        extraBody: {
          helicone: {
            sessionId: 'session-123',
          },
          custom_param: 'value',
        },
      });

      expect((model as any).extraBody).toEqual({
        prompt_id: 'test_prompt',
        inputs: { user_name: 'John' },
        helicone: {
          sessionId: 'session-123',
        },
        custom_param: 'value',
      });
    });

    it('should work without prompt parameters', () => {
      const model = provider.languageModel('gpt-4o');
      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect((model as any).extraBody).toEqual({});
    });
  });

  describe('Request Body Generation', () => {
    it('should include prompt_id and inputs when using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Test response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o', {
        promptId: 'customer_support_v1',
        inputs: { customer_name: 'Alice', issue_type: 'billing' },
        environment: 'staging',
      });

      await (model as any).doGenerate({
        prompt: [{ role: 'user', content: 'This should be ignored when using prompts' }],
        temperature: 0.7,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ai-gateway.helicone.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-key',
          }),
        })
      );

      const requestBody = getRequestBody();
      expect(requestBody).toEqual({
        model: 'gpt-4o',
        stream: false,
        prompt_id: 'customer_support_v1',
        inputs: { customer_name: 'Alice', issue_type: 'billing' },
        environment: 'staging',
        temperature: 0.7,
      });
    });

    it('should not include messages when using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o', {
        promptId: 'test_prompt',
        inputs: { name: 'Test' },
      });

      await (model as any).doGenerate({
        prompt: [{ role: 'user', content: 'This should be ignored' }],
      });

      const requestBody = getRequestBody();
      expect(requestBody).not.toHaveProperty('messages');
      expect(requestBody).toHaveProperty('prompt_id', 'test_prompt');
      expect(requestBody).toHaveProperty('inputs', { name: 'Test' });
    });

    it('should use regular messages when not using prompts', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o');

      await (model as any).doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }],
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
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o', {
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
      });

      await (model as any).doGenerate({ prompt: [] });

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
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o', {
        promptId: 'test_prompt',
        inputs: { name: 'Test' },
        environment: 'development',
      });

      await (model as any).doGenerate({ prompt: [] });

      const requestBody = getRequestBody();
      expect(requestBody).toHaveProperty('environment', 'development');
    });

    it('should not include environment when not specified', async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({
        choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }) as any);

      const model = provider.languageModel('gpt-4o', {
        promptId: 'test_prompt',
        inputs: { name: 'Test' },
      });

      await (model as any).doGenerate({ prompt: [] });

      const requestBody = getRequestBody();
      expect(requestBody).not.toHaveProperty('environment');
    });
  });
});