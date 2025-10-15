import { HeliconeProvider, createHelicone } from '../helicone-provider';
import { HeliconeLanguageModel } from '../helicone-language-model';

describe('HeliconeProvider', () => {
  describe('constructor', () => {
    it('should create provider with default settings', () => {
      const provider = new HeliconeProvider();
      expect(provider.specificationVersion).toBe('v2');
    });

    it('should create provider with custom settings', () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.helicone.ai'
      });
      expect(provider.specificationVersion).toBe('v2');
    });
  });

  describe('languageModel', () => {
    it('should create language model with model name', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('gpt-4o');

      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect(model.specificationVersion).toBe('v2');
      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('gpt-4o');
    });

    it('should accept claude model names', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('claude-3.7-sonnet');

      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('claude-3.7-sonnet');
    });

    it('should handle model names with version suffixes', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('gpt-4o-mini');

      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('gpt-4o-mini');
    });
  });

  describe('createHelicone factory function', () => {
    it('should create HeliconeProvider instance', () => {
      const provider = createHelicone();
      expect(provider).toBeInstanceOf(HeliconeProvider);
    });

    it('should pass config to provider', () => {
      const config = {
        apiKey: 'test-key',
        baseURL: 'https://test.helicone.ai',
      };
      const provider = createHelicone(config);
      expect(provider).toBeInstanceOf(HeliconeProvider);
    });
  });

  describe('modelName/providerName format routing', () => {
    let mockFetch: jest.Mock;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      mockFetch = jest.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should route gpt-4o/openai to OpenAI provider', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o/openai');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[0]).toContain('/v1/chat/completions');

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('gpt-4o/openai');
    });

    it('should route claude-3.5-sonnet/anthropic to Anthropic provider', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Claude response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 15,
            completion_tokens: 25,
            total_tokens: 40
          }
        })
      });

      const model = provider.languageModel('claude-3.5-sonnet/anthropic');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello Claude' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('claude-3.5-sonnet/anthropic');
    });

    it('should route deepseek-v3.1-terminus/novita to Novita provider', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'DeepSeek response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 12,
            completion_tokens: 18,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('deepseek-v3.1-terminus/novita');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello DeepSeek' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('deepseek-v3.1-terminus/novita');
    });

    it('should handle streaming with modelName/providerName format', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream
      });

      const model = provider.languageModel('gpt-4o-mini/openai');

      await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Stream test' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('gpt-4o-mini/openai');
      expect(requestBody.stream).toBe(true);
    });

    it('should preserve model ID without provider suffix when not specified', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20
          }
        })
      });

      const model = provider.languageModel('gpt-4o');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];

      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.model).toBe('gpt-4o');
    });

    it('should send correct headers with modelName/providerName format', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key',
        baseURL: 'https://custom.helicone.ai',
        headers: {
          'X-Custom-Header': 'custom-value'
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 5,
            total_tokens: 10
          }
        })
      });

      const model = provider.languageModel('gpt-4o/openai');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];

      expect(fetchCall[0]).toBe('https://custom.helicone.ai/v1/chat/completions');

      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toBe('Bearer test-helicone-key');
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should handle multiple different provider formats in sequence', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20
          }
        })
      };

      mockFetch.mockResolvedValue(mockResponse);

      const models = [
        'gpt-4o/openai',
        'claude-3.5-sonnet/anthropic',
        'deepseek-v3.1-terminus/novita'
      ];

      for (const modelId of models) {
        const model = provider.languageModel(modelId);
        await model.doGenerate({
          prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }]
        });
      }

      expect(mockFetch).toHaveBeenCalledTimes(3);

      const requestBodies = mockFetch.mock.calls.map(call => JSON.parse(call[1].body));
      expect(requestBodies[0].model).toBe('gpt-4o/openai');
      expect(requestBodies[1].model).toBe('claude-3.5-sonnet/anthropic');
      expect(requestBodies[2].model).toBe('deepseek-v3.1-terminus/novita');
    });
  });

  describe('Helicone metadata headers', () => {
    let mockFetch: jest.Mock;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      mockFetch = jest.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should convert properties to Helicone-Property-* headers', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            properties: {
              environment: 'development',
              feature: 'code-explanation',
              version: '1.0.0',
              language: 'typescript'
            }
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Helicone-Property-environment']).toBe('development');
      expect(headers['Helicone-Property-feature']).toBe('code-explanation');
      expect(headers['Helicone-Property-version']).toBe('1.0.0');
      expect(headers['Helicone-Property-language']).toBe('typescript');
    });

    it('should convert sessionId to Helicone-Session-Id header', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'demo-session-123456'
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Helicone-Session-Id']).toBe('demo-session-123456');
    });

    it('should convert userId to Helicone-User-Id header', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            userId: 'user-12345'
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Helicone-User-Id']).toBe('user-12345');
    });

    it('should convert tags to Helicone-Property-Tag-* headers', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            tags: ['demo', 'tutorial', 'programming']
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Helicone-Property-Tag-demo']).toBe('true');
      expect(headers['Helicone-Property-Tag-tutorial']).toBe('true');
      expect(headers['Helicone-Property-Tag-programming']).toBe('true');
    });

    it('should convert cache setting to Helicone-Cache-Enabled header', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            cache: true
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers['Helicone-Cache-Enabled']).toBe('true');
    });

    it('should convert all helicone metadata to headers simultaneously', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'demo-session-123456',
            userId: 'user-12345',
            properties: {
              environment: 'development',
              feature: 'code-explanation',
              version: '1.0.0'
            },
            tags: ['demo', 'tutorial'],
            cache: true
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      // Verify all metadata is in headers
      expect(headers['Helicone-Session-Id']).toBe('demo-session-123456');
      expect(headers['Helicone-User-Id']).toBe('user-12345');
      expect(headers['Helicone-Property-environment']).toBe('development');
      expect(headers['Helicone-Property-feature']).toBe('code-explanation');
      expect(headers['Helicone-Property-version']).toBe('1.0.0');
      expect(headers['Helicone-Property-Tag-demo']).toBe('true');
      expect(headers['Helicone-Property-Tag-tutorial']).toBe('true');
      expect(headers['Helicone-Cache-Enabled']).toBe('true');
    });

    it('should not include helicone object in request body', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'demo-session-123456',
            userId: 'user-12345',
            properties: {
              environment: 'development'
            }
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Verify helicone object is NOT in the body
      expect(requestBody.helicone).toBeUndefined();
    });

    it('should preserve other extraBody fields in request body', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: { content: 'Test response' },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'demo-session-123456'
          },
          customField: 'customValue',
          anotherField: 42
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Hello' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      // Verify helicone object is NOT in the body
      expect(requestBody.helicone).toBeUndefined();

      // Verify other extraBody fields ARE in the body
      expect(requestBody.customField).toBe('customValue');
      expect(requestBody.anotherField).toBe(42);
    });

    it('should handle helicone metadata in streaming mode', async () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-helicone-key'
      });

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: mockStream
      });

      const model = provider.languageModel('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'stream-session-123',
            properties: {
              streamTest: 'true'
            }
          }
        }
      });

      await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Stream test' }] }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;
      const requestBody = JSON.parse(fetchCall[1].body);

      // Verify metadata is in headers
      expect(headers['Helicone-Session-Id']).toBe('stream-session-123');
      expect(headers['Helicone-Property-streamTest']).toBe('true');

      // Verify helicone object is NOT in the body
      expect(requestBody.helicone).toBeUndefined();
      expect(requestBody.stream).toBe(true);
    });
  });
});
