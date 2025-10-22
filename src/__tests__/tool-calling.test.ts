import { HeliconeProvider } from '../helicone-provider';
import { z } from 'zod';
import { LanguageModelV2StreamPart, LanguageModelV2, LanguageModelV2ToolCall } from '@ai-sdk/provider';

// Type alias for the return type of doGenerate
type GenerateResult = Awaited<ReturnType<LanguageModelV2['doGenerate']>>;

// Type for OpenAI streaming response chunks used in tests
interface OpenAIStreamChunk {
  id: string;
  object: string;
  choices: Array<{
    delta?: Record<string, unknown>;
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Tool Calling', () => {
  let provider: HeliconeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HeliconeProvider({
      apiKey: 'test-key'
    });
  });

  describe('Tool Schema Conversion', () => {
    it('should convert Zod schema to JSON Schema for simple string parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'getWeather',
                  arguments: JSON.stringify({ location: 'San Francisco' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather for a location',
          inputSchema: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city name'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }]
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0]).toEqual({
        type: 'function',
        function: {
          name: 'getWeather',
          description: 'Get weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'The city name'
              }
            },
            required: ['location'],
            additionalProperties: false
          }
        }
      });
    });

    it('should convert Zod schema with optional parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response', tool_calls: [] },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          parameters: z.object({
            location: z.string().describe('City name'),
            unit: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature unit')
          })
        }] as any
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const params = requestBody.tools[0].function.parameters;

      expect(params.properties).toHaveProperty('location');
      expect(params.properties).toHaveProperty('unit');
      expect(params.required).toEqual(['location']);
      expect(params.properties.unit.enum).toEqual(['celsius', 'fahrenheit']);
    });

    it('should convert Zod schema with number parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response', tool_calls: [] },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'calculate',
          description: 'Perform calculation',
          parameters: z.object({
            a: z.number().describe('First number'),
            b: z.number().describe('Second number'),
            operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
          })
        }] as any
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const params = requestBody.tools[0].function.parameters;

      expect(params.properties.a.type).toBe('number');
      expect(params.properties.b.type).toBe('number');
      expect(params.properties.operation.enum).toEqual(['add', 'subtract', 'multiply', 'divide']);
      expect(params.required).toEqual(['a', 'b', 'operation']);
    });

    it('should handle multiple tools', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response', tool_calls: [] },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [
          {
            type: 'function',
            name: 'getWeather',
            description: 'Get weather',
            parameters: z.object({
              location: z.string()
            })
          },
          {
            type: 'function',
            name: 'calculate',
            description: 'Calculate',
            parameters: z.object({
              a: z.number(),
              b: z.number()
            })
          }
        ] as any
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.tools).toHaveLength(2);
      expect(requestBody.tools[0].function.name).toBe('getWeather');
      expect(requestBody.tools[1].function.name).toBe('calculate');
    });
  });

  describe('Tool Response Handling', () => {
    it('should handle tool_calls finish reason', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'getWeather',
                  arguments: JSON.stringify({ location: 'San Francisco' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const result: GenerateResult = await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          parameters: z.object({
            location: z.string()
          })
        }] as any
      });

      expect(result.finishReason).toBe('tool-calls');
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        type: 'tool-call',
        toolCallId: 'call_1',
        toolName: 'getWeather',
        input: { location: 'San Francisco' }
      });
    });

    it('should handle multiple tool calls in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: {
                    name: 'getWeather',
                    arguments: JSON.stringify({ location: 'San Francisco' })
                  }
                },
                {
                  id: 'call_2',
                  type: 'function',
                  function: {
                    name: 'calculate',
                    arguments: JSON.stringify({ a: 42, b: 17, operation: 'multiply' })
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const result: GenerateResult = await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [
          {
            type: 'function',
            name: 'getWeather',
            description: 'Get weather',
            inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
          },
          {
            type: 'function',
            name: 'calculate',
            description: 'Calculate',
            parameters: z.object({ a: z.number(), b: z.number(), operation: z.string() })
          }
        ] as any
      });

      expect(result.content).toHaveLength(2);
      expect((result.content[0] as LanguageModelV2ToolCall).toolName).toBe('getWeather');
      expect((result.content[1] as LanguageModelV2ToolCall).toolName).toBe('calculate');
    });
  });

  describe('Tool Choice', () => {
    it('should send tool_choice as auto', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response', tool_calls: [] },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
        }],
        toolChoice: { type: 'auto' }
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toBe('auto');
    });

    it('should send tool_choice as required', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: null, tool_calls: [] },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
        }],
        toolChoice: { type: 'required' }
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toBe('required');
    });

    it('should send tool_choice with specific tool', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: null, tool_calls: [] },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
        }],
        toolChoice: { type: 'tool', toolName: 'getWeather' }
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tool_choice).toEqual({
        type: 'function',
        function: { name: 'getWeather' }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle request without tools', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }]
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tools).toBeUndefined();
    });

    it('should handle empty tools array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: []
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.tools).toBeUndefined();
    });

    it('should handle tools with Helicone metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: null, tool_calls: [] },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini', {
        extraBody: {
          helicone: {
            sessionId: 'test-session',
            properties: {
              feature: 'tool-calling'
            },
            tags: ['test', 'tools']
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
        }]
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.model).toBe('gpt-4o-mini');

      const requestHeaders = mockFetch.mock.calls[0][1].headers;
      expect(requestHeaders['Helicone-Session-Id']).toBe('test-session');
      expect(requestHeaders['Helicone-Property-feature']).toBe('tool-calling');
      expect(requestHeaders['Helicone-Property-Tag-test']).toBe('true');
      expect(requestHeaders['Helicone-Property-Tag-tools']).toBe('true');
    });
  });

  describe('Integration with Helicone Headers', () => {
    it('should include Helicone headers with tool calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: { role: 'assistant', content: null, tool_calls: [] },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini', {
        extraBody: {
          helicone: {
            sessionId: 'tool-session-123',
            userId: 'user-456',
            properties: {
              example: 'tool-calling',
              feature: 'function-tools'
            },
            tags: ['tools', 'demo'],
            cache: true
          }
        }
      });

      await model.doGenerate({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' }
            },
            required: ['location']
          }
        }]
      });

      const requestHeaders = mockFetch.mock.calls[0][1].headers;

      expect(requestHeaders['Helicone-Session-Id']).toBe('tool-session-123');
      expect(requestHeaders['Helicone-User-Id']).toBe('user-456');
      expect(requestHeaders['Helicone-Property-example']).toBe('tool-calling');
      expect(requestHeaders['Helicone-Property-feature']).toBe('function-tools');
      expect(requestHeaders['Helicone-Property-Tag-tools']).toBe('true');
      expect(requestHeaders['Helicone-Property-Tag-demo']).toBe('true');
      expect(requestHeaders['Helicone-Cache-Enabled']).toBe('true');
    });
  });

  describe('Streaming Tool Calls', () => {
    const createMockStreamResponse = (chunks: OpenAIStreamChunk[]) => {
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
        body: stream
      };
    };

    it('should handle streaming tool calls with string arguments', async () => {
      // Mock streaming response with tool calls
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              tool_calls: [{
                index: 0,
                id: 'call_streaming_1',
                type: 'function',
                function: {
                  name: 'getWeather',
                  arguments: '{"location": "San Francisco", "unit": "fahrenheit"}'
                }
              }]
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'What is the weather?' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather for a location',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              unit: { type: 'string' }
            },
            required: ['location']
          }
        }]
      });

      const chunks: LanguageModelV2StreamPart[] = [];
      const reader = streamResult.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Verify we got the expected streaming chunks (both tool-input and tool-call events)
      const toolInputStartChunk = chunks.find(chunk => chunk.type === 'tool-input-start');
      expect(toolInputStartChunk).toBeDefined();
      expect(toolInputStartChunk!.id).toBe('call_streaming_1');
      expect(toolInputStartChunk!.toolName).toBe('getWeather');

      const toolInputEndChunk = chunks.find(chunk => chunk.type === 'tool-input-end');
      expect(toolInputEndChunk).toBeDefined();
      expect(toolInputEndChunk!.id).toBe('call_streaming_1');

      const toolCallChunk = chunks.find(chunk => chunk.type === 'tool-call');
      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk!.toolCallId).toBe('call_streaming_1');
      expect(toolCallChunk!.toolName).toBe('getWeather');
      expect(toolCallChunk!.input).toEqual({"location": "San Francisco", "unit": "fahrenheit"});

      const finishChunk = chunks.find(chunk => chunk.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk!.finishReason).toBe('tool-calls');
    });

    it('should handle streaming tool calls with empty arguments', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              tool_calls: [{
                index: 0,
                id: 'call_streaming_2',
                type: 'function',
                function: {
                  name: 'getCurrentTime',
                  arguments: ''
                }
              }]
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'tool_calls'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'What time is it?' }] }],
        tools: [{
          type: 'function',
          name: 'getCurrentTime',
          description: 'Get current time',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }]
      });

      const chunks: LanguageModelV2StreamPart[] = [];
      const reader = streamResult.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Check for both tool-input and tool-call events
      const toolInputStart = chunks.find(chunk => chunk.type === 'tool-input-start');
      expect(toolInputStart).toBeDefined();
      expect(toolInputStart!.id).toBe('call_streaming_2');
      expect(toolInputStart!.toolName).toBe('getCurrentTime');

      const toolInputEnd = chunks.find(chunk => chunk.type === 'tool-input-end');
      expect(toolInputEnd).toBeDefined();
      expect(toolInputEnd!.id).toBe('call_streaming_2');

      const toolCallChunk = chunks.find(chunk => chunk.type === 'tool-call');
      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk!.toolCallId).toBe('call_streaming_2');
      expect(toolCallChunk!.toolName).toBe('getCurrentTime');
      expect(toolCallChunk!.input).toEqual({});

      const finishChunk = chunks.find(chunk => chunk.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk!.finishReason).toBe('tool-calls');
    });

    it('should handle streaming tool calls with missing arguments', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              tool_calls: [{
                index: 0,
                id: 'call_streaming_3',
                type: 'function',
                function: {
                  name: 'simpleAction'
                  // No arguments field
                }
              }]
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'tool_calls'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Do something simple' }] }],
        tools: [{
          type: 'function',
          name: 'simpleAction',
          description: 'Perform a simple action',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }]
      });

      const chunks: LanguageModelV2StreamPart[] = [];
      const reader = streamResult.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Check for both tool-input and tool-call events
      const toolInputStart = chunks.find(chunk => chunk.type === 'tool-input-start');
      expect(toolInputStart).toBeDefined();
      expect(toolInputStart!.id).toBe('call_streaming_3');
      expect(toolInputStart!.toolName).toBe('simpleAction');

      const toolInputEnd = chunks.find(chunk => chunk.type === 'tool-input-end');
      expect(toolInputEnd).toBeDefined();
      expect(toolInputEnd!.id).toBe('call_streaming_3');

      const toolCallChunk = chunks.find(chunk => chunk.type === 'tool-call');
      expect(toolCallChunk).toBeDefined();
      expect(toolCallChunk!.toolCallId).toBe('call_streaming_3');
      expect(toolCallChunk!.toolName).toBe('simpleAction');
      expect(toolCallChunk!.input).toEqual({});

      const finishChunk = chunks.find(chunk => chunk.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk!.finishReason).toBe('tool-calls');
    });

    it('should handle streaming with multiple tool calls', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: 'call_multi_1',
                  type: 'function',
                  function: {
                    name: 'getWeather',
                    arguments: '{"location": "San Francisco"}'
                  }
                },
                {
                  index: 1,
                  id: 'call_multi_2',
                  type: 'function',
                  function: {
                    name: 'calculate',
                    arguments: '{"a": 42, "b": 17, "operation": "multiply"}'
                  }
                }
              ]
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'tool_calls'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Get weather and calculate' }] }],
        tools: [
          {
            type: 'function',
            name: 'getWeather',
            description: 'Get weather',
            inputSchema: {
              type: 'object',
              properties: { location: { type: 'string' } },
              required: ['location']
            }
          },
          {
            type: 'function',
            name: 'calculate',
            description: 'Calculate',
            inputSchema: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' },
                operation: { type: 'string' }
              },
              required: ['a', 'b', 'operation']
            }
          }
        ]
      });

      const chunks: LanguageModelV2StreamPart[] = [];
      const reader = streamResult.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Check for both tool-input and tool-call events
      const toolInputStarts = chunks.filter(chunk => chunk.type === 'tool-input-start');
      expect(toolInputStarts).toHaveLength(2);

      const weatherStart = toolInputStarts.find(chunk => chunk.toolName === 'getWeather');
      expect(weatherStart).toBeDefined();
      expect(weatherStart!.id).toBe('call_multi_1');

      const calcStart = toolInputStarts.find(chunk => chunk.toolName === 'calculate');
      expect(calcStart).toBeDefined();
      expect(calcStart!.id).toBe('call_multi_2');

      const toolInputEnds = chunks.filter(chunk => chunk.type === 'tool-input-end');
      expect(toolInputEnds).toHaveLength(2);

      const toolCallChunks = chunks.filter(chunk => chunk.type === 'tool-call');
      expect(toolCallChunks).toHaveLength(2);

      const weatherCall = toolCallChunks.find(chunk => chunk.toolName === 'getWeather');
      expect(weatherCall).toBeDefined();
      expect(weatherCall!.toolCallId).toBe('call_multi_1');
      expect(weatherCall!.input).toEqual({"location": "San Francisco"});

      const calcCall = toolCallChunks.find(chunk => chunk.toolName === 'calculate');
      expect(calcCall).toBeDefined();
      expect(calcCall!.toolCallId).toBe('call_multi_2');
      expect(calcCall!.input).toEqual({"a": 42, "b": 17, "operation": "multiply"});

      const finishChunk = chunks.find(chunk => chunk.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk!.finishReason).toBe('tool-calls');
    });

    it('should handle streaming with mixed text and tool calls', async () => {
      const streamChunks = [
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              content: 'Let me check the weather for you. '
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {
              tool_calls: [{
                index: 0,
                id: 'call_mixed_1',
                type: 'function',
                function: {
                  name: 'getWeather',
                  arguments: '{"location": "New York", "unit": "celsius"}'
                }
              }]
            },
            finish_reason: null
          }]
        },
        {
          id: 'chatcmpl-test',
          object: 'chat.completion.chunk',
          choices: [{
            delta: {},
            finish_reason: 'tool_calls'
          }]
        }
      ];

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      const streamResult = await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'What is the weather in NY?' }] }],
        tools: [{
          type: 'function',
          name: 'getWeather',
          description: 'Get weather',
          inputSchema: {
            type: 'object',
            properties: {
              location: { type: 'string' },
              unit: { type: 'string' }
            },
            required: ['location']
          }
        }]
      });

      const chunks: LanguageModelV2StreamPart[] = [];
      const reader = streamResult.stream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }

      // Should have text-delta, tool-input, and tool-call chunks
      const textChunks = chunks.filter(chunk => chunk.type === 'text-delta');
      const toolInputStarts = chunks.filter(chunk => chunk.type === 'tool-input-start');
      const toolCallChunks = chunks.filter(chunk => chunk.type === 'tool-call');

      expect(textChunks.length).toBeGreaterThan(0);
      expect(toolInputStarts).toHaveLength(1);
      expect(toolCallChunks).toHaveLength(1);

      const textChunk = textChunks[0];
      expect(textChunk.delta).toBe('Let me check the weather for you. ');

      const toolInputStart = toolInputStarts[0];
      expect(toolInputStart.id).toBe('call_mixed_1');
      expect(toolInputStart.toolName).toBe('getWeather');

      const toolInputEnd = chunks.find(chunk => chunk.type === 'tool-input-end');
      expect(toolInputEnd).toBeDefined();
      expect(toolInputEnd!.id).toBe('call_mixed_1');

      const toolCallChunk = toolCallChunks[0];
      expect(toolCallChunk.toolCallId).toBe('call_mixed_1');
      expect(toolCallChunk.toolName).toBe('getWeather');
      expect(toolCallChunk.input).toEqual({"location": "New York", "unit": "celsius"});

      const finishChunk = chunks.find(chunk => chunk.type === 'finish');
      expect(finishChunk).toBeDefined();
      expect(finishChunk!.finishReason).toBe('tool-calls');
    });

    it('should verify streaming request format includes correct tool definitions', async () => {
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

      mockFetch.mockResolvedValueOnce(createMockStreamResponse(streamChunks));

      const model = provider.languageModel('gpt-4o-mini');
      await model.doStream({
        prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test tool definitions' }] }],
        tools: [{
          type: 'function',
          name: 'testTool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string', description: 'First parameter' },
              param2: { type: 'number', description: 'Second parameter' }
            },
            required: ['param1']
          }
        }]
      });

      // Verify the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);

      expect(requestBody.stream).toBe(true);
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0]).toEqual({
        type: 'function',
        function: {
          name: 'testTool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              param1: { type: 'string', description: 'First parameter' },
              param2: { type: 'number', description: 'Second parameter' }
            },
            required: ['param1']
          }
        }
      });
    });
  });
});

