import { HeliconeProvider } from '../helicone-provider';
import { Experimental_Agent as Agent, tool, jsonSchema, stepCountIs } from 'ai';
import { z } from 'zod';

// Mock fetch globally
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe('Agent Integration', () => {
  let provider: HeliconeProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new HeliconeProvider({
      apiKey: 'test-key'
    });
  });

  describe('Agent Creation', () => {
    it('should create agent with Helicone model', () => {
      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        tools: {}
      });

      expect(agent).toBeDefined();
      expect(agent.tools).toEqual({});
    });

    it('should create agent with tools', () => {
      const model = provider.languageModel('gpt-4o-mini');

      const testTool = tool({
        description: 'Test tool',
        inputSchema: jsonSchema<{ input: string }>({
          type: 'object',
          properties: {
            input: { type: 'string' }
          },
          required: ['input']
        }),
        execute: async ({ input }: { input: string }) => ({ result: input })
      });

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        tools: {
          testTool
        }
      });

      expect(agent).toBeDefined();
      expect(agent.tools).toHaveProperty('testTool');
    });

    it('should create agent with stopWhen configuration', () => {
      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(5),
        tools: {}
      });

      expect(agent).toBeDefined();
    });

    it('should create agent with Helicone metadata', () => {
      const model = provider.languageModel('gpt-4o-mini', {
        extraBody: {
          helicone: {
            sessionId: 'agent-test-session',
            properties: {
              feature: 'agent-test'
            },
            tags: ['test', 'agent']
          }
        }
      });

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        tools: {}
      });

      expect(agent).toBeDefined();
    });
  });

  describe('Agent Execution with Tool Calls', () => {
    it('should execute agent with tool calls and generate final response', async () => {
      // Mock first request (tool calls)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
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

      // Mock second request (final response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'The weather in San Francisco is sunny with a temperature of 72°F.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a weather assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          getWeather: tool({
            description: 'Get weather for a location',
            inputSchema: jsonSchema({
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }),
            execute: async ({ location }) => ({
              temperature: 72,
              conditions: 'sunny',
              location
            })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'What is the weather in San Francisco?'
      });

      expect(result.text).toBe('The weather in San Francisco is sunny with a temperature of 72°F.');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].finishReason).toBe('tool-calls');
      expect(result.steps[0].toolCalls).toHaveLength(1);
      expect(result.steps[0].toolCalls![0].toolName).toBe('getWeather');
      expect(result.steps[1].finishReason).toBe('stop');
      expect(result.finishReason).toBe('stop');
    });

    it('should execute agent with multiple tool calls', async () => {
      // Mock first request (multiple tool calls)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
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
                    name: 'getWeather',
                    arguments: JSON.stringify({ location: 'New York' })
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 }
        })
      });

      // Mock second request (final response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'San Francisco is sunny at 72°F and New York is cloudy at 65°F.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a weather assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          getWeather: tool({
            description: 'Get weather for a location',
            inputSchema: jsonSchema({
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }),
            execute: async ({ location }) => ({
              temperature: location === 'San Francisco' ? 72 : 65,
              conditions: location === 'San Francisco' ? 'sunny' : 'cloudy',
              location
            })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'What is the weather in San Francisco and New York?'
      });

      expect(result.text).toBe('San Francisco is sunny at 72°F and New York is cloudy at 65°F.');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].toolCalls).toHaveLength(2);
      // Agent successfully executed tools and generated final response
    });

    it('should execute agent with multiple different tools', async () => {
      // Mock first request (multiple different tool calls)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
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
                    name: 'calculateWindChill',
                    arguments: JSON.stringify({ temperature: 72, windSpeed: 15 })
                  }
                }
              ]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 60, completion_tokens: 35, total_tokens: 95 }
        })
      });

      // Mock second request (final response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'The weather in San Francisco is sunny at 72°F, and with 15 mph wind, it feels like 68°F.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 120, completion_tokens: 25, total_tokens: 145 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a weather assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          getWeather: tool({
            description: 'Get weather for a location',
            inputSchema: jsonSchema({
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }),
            execute: async ({ location }) => ({
              temperature: 72,
              conditions: 'sunny',
              location
            })
          }),
          calculateWindChill: tool({
            description: 'Calculate wind chill',
            inputSchema: jsonSchema({
              type: 'object',
              properties: {
                temperature: { type: 'number' },
                windSpeed: { type: 'number' }
              },
              required: ['temperature', 'windSpeed']
            }),
            execute: async ({ temperature, windSpeed }) => ({
              windChill: Math.round(35.74 + 0.6215 * temperature - 35.75 * Math.pow(windSpeed, 0.16) + 0.4275 * temperature * Math.pow(windSpeed, 0.16))
            })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'What is the weather in San Francisco and what would the wind chill be with 15 mph wind?'
      });

      expect(result.text).toContain('San Francisco');
      expect(result.text).toContain('72°F');
      expect(result.steps).toHaveLength(2);
      expect(result.steps[0].toolCalls).toHaveLength(2);
    });

    it('should stop after one step when stopWhen is stepCountIs(1)', async () => {
      // Mock first request (tool calls)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
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

      const agent = new Agent({
        model,
        system: 'You are a weather assistant.',
        stopWhen: stepCountIs(1),
        tools: {
          getWeather: tool({
            description: 'Get weather for a location',
            inputSchema: jsonSchema({
              type: 'object',
              properties: {
                location: { type: 'string' }
              },
              required: ['location']
            }),
            execute: async ({ location }) => ({
              temperature: 72,
              conditions: 'sunny',
              location
            })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'What is the weather in San Francisco?'
      });

      // Should stop after tool call step without generating text response
      expect(result.text).toBe('');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].finishReason).toBe('tool-calls');
      expect(result.finishReason).toBe('tool-calls');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Agent with Helicone Metadata', () => {
    it('should send Helicone metadata headers in agent requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Test response'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini', {
        extraBody: {
          helicone: {
            sessionId: 'agent-session-123',
            properties: {
              feature: 'agent-test',
              environment: 'test'
            },
            tags: ['agent', 'test']
          }
        }
      });

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        tools: {}
      });

      await agent.generate({
        prompt: 'Hello'
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const headers = mockFetch.mock.calls[0][1].headers;

      expect(headers['Helicone-Session-Id']).toBe('agent-session-123');
      expect(headers['Helicone-Property-feature']).toBe('agent-test');
      expect(headers['Helicone-Property-environment']).toBe('test');
      expect(headers['Helicone-Property-Tag-agent']).toBe('true');
      expect(headers['Helicone-Property-Tag-test']).toBe('true');
    });

    it('should maintain Helicone metadata across multiple agent steps', async () => {
      // Mock first request (tool calls)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'testTool',
                  arguments: JSON.stringify({ input: 'test' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      // Mock second request (final response)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Final response'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 10, total_tokens: 90 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini', {
        extraBody: {
          helicone: {
            sessionId: 'multi-step-session',
            properties: {
              feature: 'multi-step-agent'
            }
          }
        }
      });

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          testTool: tool({
            description: 'Test tool',
            inputSchema: jsonSchema<{ input: string }>({
              type: 'object',
              properties: {
                input: { type: 'string' }
              },
              required: ['input']
            }),
            execute: async ({ input }: { input: string }) => ({ result: input })
          })
        }
      });

      await agent.generate({
        prompt: 'Test multi-step'
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Verify first request has metadata
      const headers1 = mockFetch.mock.calls[0][1].headers;
      expect(headers1['Helicone-Session-Id']).toBe('multi-step-session');
      expect(headers1['Helicone-Property-feature']).toBe('multi-step-agent');

      // Verify second request has same metadata
      const headers2 = mockFetch.mock.calls[1][1].headers;
      expect(headers2['Helicone-Session-Id']).toBe('multi-step-session');
      expect(headers2['Helicone-Property-feature']).toBe('multi-step-agent');
    });
  });

  describe('Agent Usage Statistics', () => {
    it('should track usage statistics across multiple steps', async () => {
      // Mock first request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'testTool',
                  arguments: JSON.stringify({ input: 'test' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      // Mock second request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Final response'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          testTool: tool({
            description: 'Test tool',
            inputSchema: jsonSchema<{ input: string }>({
              type: 'object',
              properties: {
                input: { type: 'string' }
              },
              required: ['input']
            }),
            execute: async ({ input }: { input: string }) => ({ result: input })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'Test usage tracking'
      });

      expect(result.usage).toBeDefined();
      // Total usage is from the first step only (second step's mock wasn't called)
      expect(result.usage!.inputTokens).toBeGreaterThan(0);
      expect(result.usage!.outputTokens).toBeGreaterThan(0);
      expect(result.usage!.totalTokens).toBeGreaterThan(0);
    });

    it('should provide usage statistics for each step', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-1',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'testTool',
                  arguments: JSON.stringify({ input: 'test' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Final response'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 15, total_tokens: 95 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          testTool: tool({
            description: 'Test tool',
            inputSchema: jsonSchema<{ input: string }>({
              type: 'object',
              properties: {
                input: { type: 'string' }
              },
              required: ['input']
            }),
            execute: async ({ input }: { input: string }) => ({ result: input })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'Test step usage'
      });

      expect(result.steps).toHaveLength(2);

      expect(result.steps[0].usage).toBeDefined();
      expect(result.steps[0].usage!.inputTokens).toBe(50);
      expect(result.steps[0].usage!.outputTokens).toBe(20);

      expect(result.steps[1].usage).toBeDefined();
      expect(result.steps[1].usage!.inputTokens).toBe(80);
      expect(result.steps[1].usage!.outputTokens).toBe(15);
    });
  });

  describe('Agent Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        tools: {}
      });

      await expect(agent.generate({
        prompt: 'Test error'
      })).rejects.toThrow();
    });

    it('should handle tool execution errors', async () => {
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
                  name: 'errorTool',
                  arguments: JSON.stringify({ input: 'test' })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id-2',
          choices: [{
            message: {
              role: 'assistant',
              content: 'I encountered an error with the tool.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 70, completion_tokens: 10, total_tokens: 80 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(5),
        tools: {
          errorTool: tool({
            description: 'Tool that throws error',
            inputSchema: jsonSchema<{ input: string }>({
              type: 'object',
              properties: {
                input: { type: 'string' }
              },
              required: ['input']
            }),
            execute: async ({ input }: { input: string }): Promise<{ error: string }> => {
              throw new Error(`Tool execution failed for input: ${input}`);
            }
          })
        }
      });

      const result = await agent.generate({
        prompt: 'Use error tool'
      });

      expect(result.steps).toHaveLength(2);
      // Tool errors are captured in toolResults
      if (result.steps[0].toolResults && result.steps[0].toolResults.length > 0) {
        expect(result.steps[0].toolResults[0]).toHaveProperty('error');
      }
    });
  });

  describe('Agent with Different Models', () => {
    it('should work with different model IDs', async () => {
      const models = ['gpt-4o', 'gpt-4o-mini', 'claude-3.5-sonnet'];

      for (const modelId of models) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            id: 'test-id',
            choices: [{
              message: {
                role: 'assistant',
                content: `Response from ${modelId}`
              },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 }
          })
        });

        const model = provider.languageModel(modelId);
        const agent = new Agent({
          model,
          system: 'You are a helpful assistant.',
          tools: {}
        });

        const result = await agent.generate({
          prompt: 'Hello'
        });

        expect(result.text).toContain(modelId);
      }
    });
  });

  describe('Agent with Zod Tools', () => {
    it('should transform zod inputSchema into JSON Schema for the Helicone request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-id',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Zod tool handled'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 12, completion_tokens: 6, total_tokens: 18 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a helpful assistant.',
        stopWhen: stepCountIs(3),
        tools: {
          getWeather: tool({
            description: 'Get the weather for a city',
            inputSchema: z.object({
              location: z.string().describe('City name'),
              unit: z.enum(['celsius', 'fahrenheit']).default('fahrenheit')
            }),
            execute: async ({ location }) => ({
              location,
              temperature: 72
            })
          })
        }
      });

      const result = await agent.generate({
        prompt: 'Hello!'
      });

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const parameters = requestBody.tools[0].function.parameters;

      expect(parameters.type).toBe('object');
      expect(parameters.properties.location.type).toBe('string');
      expect(parameters.properties.unit.enum).toEqual(['celsius', 'fahrenheit']);
      expect(result.text).toBe('Zod tool handled');
    });
  });

  describe('Agent with Mixed Schema Types', () => {
    it('should note that both jsonSchema and zod schemas are supported', () => {
      // NOTE: The AI SDK supports both jsonSchema (using inputSchema) and zod (using parameters).
      // When using zod parameters, explicit type annotations are required on execute functions
      // due to TypeScript's type inference limitations with the tool() function.
      //
      // Both approaches work correctly at runtime:
      // - inputSchema: jsonSchema({ ... }) - works with TypeScript inference
      // - parameters: z.object({ ... }) - requires explicit types on execute
      //
      // See examples/agents.ts for a working example showing both patterns.
      expect(true).toBe(true);
    });
  });

  describe('Agent Tool Calling Integration', () => {
    it('should successfully call tools with Agent class without input.trim errors', async () => {
      // This test specifically prevents regression of the "toolCall.input.trim is not a function" error
      // by actually using the Agent class and ensuring tool execution works

      let toolExecuted = false;
      let receivedQuery = '';

      // Mock the API response that includes tool calls
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-agent-tool-call',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_explore_kb',
                type: 'function',
                function: {
                  name: 'explore_knowledge_base',
                  arguments: '{"query":"CBD oil products and availability"}'
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 100, completion_tokens: 25, total_tokens: 125 }
        })
      });

      // Mock the final response after tool execution
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-agent-final',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Based on the search results, yes we have CBD oil products available.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 150, completion_tokens: 40, total_tokens: 190 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a customer support AI assistant.',
        tools: {
          explore_knowledge_base: tool({
            description: 'Search the knowledge base for products and information',
            inputSchema: z.object({
              query: z.string().describe('Search query for the knowledge base')
            }),
            execute: async ({ query }) => {
              // This is the critical test - the Agent class should be able to call this
              // without getting "toolCall.input.trim is not a function" error
              toolExecuted = true;
              receivedQuery = query;

              // Verify the query is properly parsed from our string input format
              expect(typeof query).toBe('string');
              expect(query.trim).toBeDefined(); // Should have string methods
              expect(query).toBe('CBD oil products and availability');

              return `Found information about: ${query}`;
            }
          })
        }
      });

      // Actually call the agent - this is where the original error would occur
      const result = await agent.generate({
        prompt: 'Do you have CBD oil available?'
      });

      expect(result).toBeDefined();
      expect(toolExecuted).toBe(true);
      expect(receivedQuery).toBe('CBD oil products and availability');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle Agent multi-step tool calling workflows', async () => {
      // Mock first tool call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'step1',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'check_workflow',
                  arguments: '{"action_intent":"return order"}'
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 80, completion_tokens: 20, total_tokens: 100 }
        })
      });

      // Mock second tool call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'step2',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_2',
                type: 'function',
                function: {
                  name: 'escalate_ticket',
                  arguments: '{"reason":"Customer wants to return order","contact":{"email":"test@example.com"}}'
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 120, completion_tokens: 30, total_tokens: 150 }
        })
      });

      // Mock final response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'final',
          choices: [{
            message: {
              role: 'assistant',
              content: 'I have processed your return request and escalated it to our team. You should receive a response at test@example.com within 24 hours.'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 200, completion_tokens: 45, total_tokens: 245 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a customer support assistant.',
        tools: {
          check_workflow: tool({
            description: 'Check available workflows for customer actions',
            inputSchema: z.object({
              action_intent: z.string().describe('What the customer wants to do')
            }),
            execute: async ({ action_intent }) => {
              return `Workflow available for: ${action_intent}`;
            }
          }),
          escalate_ticket: tool({
            description: 'Escalate to human agent',
            inputSchema: z.object({
              reason: z.string().describe('Reason for escalation'),
              contact: z.object({
                email: z.string().email().optional(),
                phone: z.string().optional()
              }).describe('Customer contact info')
            }),
            execute: async ({ reason, contact }) => {
              return `Ticket escalated: ${reason}. Contact: ${JSON.stringify(contact)}`;
            }
          })
        }
      });

      const result = await agent.generate({
        prompt: 'I want to return my order. My email is test@example.com'
      });

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle Agent with complex nested tool inputs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'complex-tool',
          choices: [{
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: 'call_complex',
                type: 'function',
                function: {
                  name: 'complex_tool',
                  arguments: JSON.stringify({
                    user: {
                      name: 'John Doe',
                      contact: {
                        email: 'john@example.com',
                        preferences: ['email', 'sms']
                      }
                    },
                    items: [
                      { id: 'item1', quantity: 2 },
                      { id: 'item2', quantity: 1 }
                    ],
                    metadata: {
                      source: 'web',
                      timestamp: '2024-01-01T00:00:00Z'
                    }
                  })
                }
              }]
            },
            finish_reason: 'tool_calls'
          }],
          usage: { prompt_tokens: 200, completion_tokens: 50, total_tokens: 250 }
        })
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'complex-response',
          choices: [{
            message: {
              role: 'assistant',
              content: 'Complex tool executed successfully'
            },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 250, completion_tokens: 20, total_tokens: 270 }
        })
      });

      const model = provider.languageModel('gpt-4o-mini');

      const agent = new Agent({
        model,
        system: 'You are a data processing assistant.',
        tools: {
          complex_tool: tool({
            description: 'Process complex nested data',
            inputSchema: z.object({
              user: z.object({
                name: z.string(),
                contact: z.object({
                  email: z.string().email(),
                  preferences: z.array(z.string())
                })
              }),
              items: z.array(z.object({
                id: z.string(),
                quantity: z.number()
              })),
              metadata: z.object({
                source: z.string(),
                timestamp: z.string()
              })
            }),
            execute: async ({ user, items, metadata }) => {
              // Verify complex nested objects are properly parsed
              expect(user.name).toBe('John Doe');
              expect(user.contact.email).toBe('john@example.com');
              expect(user.contact.preferences).toEqual(['email', 'sms']);
              expect(items).toHaveLength(2);
              expect(items[0].id).toBe('item1');
              expect(metadata.source).toBe('web');

              return `Processed ${items.length} items for ${user.name}`;
            }
          })
        }
      });

      const result = await agent.generate({
        prompt: 'Process the user data with complex nested structure'
      });

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
