import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { createHelicone } from '../helicone-provider';
import { generateText, streamText } from 'ai';

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers(),
});

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

describe('Basic Usage - generateText', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key',
    });
  });

  it('should generate text with basic prompt', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Silent circuits hum,\nAI dreams in binary code,\nFuture unfolds bright.'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 17,
        total_tokens: 32
      }
    }) as any);

    const result = await generateText({
      model: helicone('claude-3.7-sonnet'),
      prompt: 'Write a haiku about artificial intelligence',
    });

    expect(result.text).toBe('Silent circuits hum,\nAI dreams in binary code,\nFuture unfolds bright.');
    expect(result.usage.inputTokens).toBe(15);
    expect(result.usage.outputTokens).toBe(17);
    expect(result.usage.totalTokens).toBe(32);
    expect(result.finishReason).toBe('stop');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.model).toBe('claude-3.7-sonnet');
    expect(requestBody.messages).toBeDefined();
    expect(requestBody.messages[0].role).toBe('user');
    expect(requestBody.messages[0].content).toBeDefined();
    if (Array.isArray(requestBody.messages[0].content)) {
      expect(requestBody.messages[0].content[0].text).toContain('Write a haiku about artificial intelligence');
    } else {
      expect(requestBody.messages[0].content).toContain('Write a haiku about artificial intelligence');
    }
  });

  it('should handle different model names', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    const result = await generateText({
      model: helicone('gpt-4o'),
      prompt: 'Hello',
    });

    expect(result.text).toBe('Test response');
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.model).toBe('gpt-4o');
  });

  it('should send correct headers with API key', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    await generateText({
      model: helicone('gpt-4o'),
      prompt: 'Test',
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers).toBeDefined();
    expect(headers['Authorization']).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should handle maxOutputTokens parameter', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Short response'
        },
        finish_reason: 'length'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    const result = await generateText({
      model: helicone('gpt-4o'),
      prompt: 'Write a long story',
      maxOutputTokens: 50,
    });

    expect(result.finishReason).toBe('length');
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.max_tokens).toBe(50);
  });

  it('should handle temperature parameter', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Creative response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    await generateText({
      model: helicone('gpt-4o'),
      prompt: 'Be creative',
      temperature: 0.9,
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.temperature).toBe(0.9);
  });
});

describe('Basic Usage - streamText', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key',
    });
  });

  it('should stream text response', async () => {
    const streamChunks = [
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: 'Once' },
          finish_reason: null
        }]
      },
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: ' upon' },
          finish_reason: null
        }]
      },
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: ' a' },
          finish_reason: null
        }]
      },
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: ' time' },
          finish_reason: null
        }]
      },
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: {},
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 20,
          completion_tokens: 4,
          total_tokens: 24
        }
      }
    ];

    mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

    const result = streamText({
      model: helicone('gpt-4o-mini'),
      prompt: 'Write a short story about a robot learning to paint',
      maxOutputTokens: 300,
    });

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    expect(fullText).toBe('Once upon a time');

    const usage = await result.usage;
    expect(usage.inputTokens).toBe(20);
    expect(usage.outputTokens).toBe(4);
    expect(usage.totalTokens).toBe(24);

    const finishReason = await result.finishReason;
    expect(finishReason).toBe('stop');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.model).toBe('gpt-4o-mini');
    expect(requestBody.stream).toBe(true);
    expect(requestBody.max_tokens).toBe(300);
  });

  it('should handle streaming with maxOutputTokens', async () => {
    const streamChunks = [
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: { content: 'Short' },
          finish_reason: null
        }]
      },
      {
        id: 'chatcmpl-test',
        object: 'chat.completion.chunk',
        choices: [{
          delta: {},
          finish_reason: 'length'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11
        }
      }
    ];

    mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks) as any);

    const result = streamText({
      model: helicone('gpt-4o-mini'),
      prompt: 'Write a story',
      maxOutputTokens: 5,
    });

    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    expect(text).toBe('Short');
    const finishReason = await result.finishReason;
    expect(finishReason).toBe('length');
  });

  it('should send correct headers for streaming', async () => {
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
    });

    // Consume stream
    for await (const chunk of result.textStream) {
      // Just consume
    }

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers).toBeDefined();
    expect(headers['Authorization']).toBe('Bearer test-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should handle empty stream gracefully', async () => {
    const streamChunks = [
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
    });

    let text = '';
    for await (const chunk of result.textStream) {
      text += chunk;
    }

    expect(text).toBe('');
    const finishReason = await result.finishReason;
    expect(finishReason).toBe('stop');
  });
});

describe('Helicone Metadata Tracking', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key',
    });
  });

  it('should send Helicone metadata headers with generateText', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: 'Test response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    await generateText({
      model: helicone('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'demo-session-123456',
            userId: 'user-12345',
            properties: {
              environment: 'development',
              feature: 'code-explanation',
              version: '1.0.0',
              language: 'typescript',
            },
            tags: ['demo', 'tutorial', 'programming'],
            cache: true,
          },
        },
      }),
      prompt: 'Explain how async/await works in JavaScript with a simple example.',
    });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers).toBeDefined();

    expect(headers['Helicone-Session-Id']).toBe('demo-session-123456');
    expect(headers['Helicone-User-Id']).toBe('user-12345');
    expect(headers['Helicone-Property-environment']).toBe('development');
    expect(headers['Helicone-Property-feature']).toBe('code-explanation');
    expect(headers['Helicone-Property-version']).toBe('1.0.0');
    expect(headers['Helicone-Property-language']).toBe('typescript');
    expect(headers['Helicone-Property-Tag-demo']).toBe('true');
    expect(headers['Helicone-Property-Tag-tutorial']).toBe('true');
    expect(headers['Helicone-Property-Tag-programming']).toBe('true');
    expect(headers['Helicone-Cache-Enabled']).toBe('true');

    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.helicone).toBeUndefined();
  });

  it('should send Helicone metadata headers with streamText', async () => {
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
      model: helicone('gpt-4o', {
        extraBody: {
          helicone: {
            sessionId: 'stream-session-123',
            properties: {
              streamTest: 'true'
            }
          }
        }
      }),
      prompt: 'Stream test',
    });

    for await (const chunk of result.textStream) {
      // Consume stream
    }

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs).toBeDefined();
    expect(callArgs[1]).toBeDefined();
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers).toBeDefined();

    expect(headers['Helicone-Session-Id']).toBe('stream-session-123');
    expect(headers['Helicone-Property-streamTest']).toBe('true');

    const requestBody = JSON.parse(callArgs[1]?.body as string);
    expect(requestBody.helicone).toBeUndefined();
    expect(requestBody.stream).toBe(true);
  });
});

