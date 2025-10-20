import { HeliconeProvider } from '../helicone-provider';
import { z } from 'zod';

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

      const result: any = await model.doGenerate({
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

      const result: any = await model.doGenerate({
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
      expect(result.content[0].toolName).toBe('getWeather');
      expect(result.content[1].toolName).toBe('calculate');
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
});

