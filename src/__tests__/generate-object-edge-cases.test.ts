import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { generateObject } from "ai";
import { createHelicone } from "../helicone-provider";
import { z } from "zod";

const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
(global as any).fetch = mockFetch;

const createMockResponse = (data: any, ok = true) => ({
  ok,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers()
});

describe('generateObject edge cases and error handling', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key'
    });
  });

  it('should handle very simple schema', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({ answer: '4' })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        answer: z.string()
      }),
      prompt: "What is 2+2? Answer with just the number"
    });

    expect(typeof object.answer).toBe('string');
    expect(object.answer).toContain('4');
  });

  it('should handle schema with default values', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            name: 'Bob',
            age: 30,
            city: 'New York'
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 10,
        total_tokens: 20
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        name: z.string(),
        age: z.number().default(25),
        city: z.string().default('Unknown')
      }),
      prompt: "Generate info for a person named Bob"
    });

    expect(object.name).toContain('Bob');
    expect(typeof object.age).toBe('number');
    expect(typeof object.city).toBe('string');
  });

  it('should handle schema with deeply nested objects', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            company: {
              info: {
                name: 'TechCorp',
                details: {
                  founded: 2020,
                  location: {
                    city: 'San Francisco',
                    country: 'USA'
                  }
                }
              }
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 20,
        total_tokens: 35
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        company: z.object({
          info: z.object({
            name: z.string(),
            details: z.object({
              founded: z.number(),
              location: z.object({
                city: z.string(),
                country: z.string()
              })
            })
          })
        })
      }),
      prompt: "Generate information about a tech company founded in San Francisco in 2020"
    });

    expect(typeof object.company.info.name).toBe('string');
    expect(object.company.info.details.founded).toBe(2020);
    expect(object.company.info.details.location.city).toContain('San Francisco');
    expect(typeof object.company.info.details.location.country).toBe('string');
  });

  it('should handle arrays of objects', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            team: {
              members: [
                { name: 'Alice', role: 'Senior Developer', yearsExperience: 5 },
                { name: 'Bob', role: 'Developer', yearsExperience: 3 },
                { name: 'Charlie', role: 'Junior Developer', yearsExperience: 1 }
              ]
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 25,
        total_tokens: 37
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        team: z.object({
          members: z.array(z.object({
            name: z.string(),
            role: z.string(),
            yearsExperience: z.number()
          }))
        })
      }),
      prompt: "Generate a team of 3 software developers"
    });

    expect(Array.isArray(object.team.members)).toBe(true);
    expect(object.team.members.length).toBe(3);

    object.team.members.forEach(member => {
      expect(typeof member.name).toBe('string');
      expect(typeof member.role).toBe('string');
      expect(typeof member.yearsExperience).toBe('number');
    });
  });

  it('should handle union types', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            response: {
              status: 'success',
              value: 'hello world'
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 8,
        total_tokens: 20
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        response: z.object({
          status: z.union([z.literal('success'), z.literal('error')]),
          value: z.union([z.string(), z.number()])
        })
      }),
      prompt: "Generate a success response with a string value 'hello world'"
    });

    expect(['success', 'error']).toContain(object.response.status);
    expect(object.response.status).toBe('success');
    expect(['string', 'number']).toContain(typeof object.response.value);
  });

  it('should handle schema with descriptions and constraints', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            event: {
              title: 'JavaScript Workshop',
              attendees: 25,
              date: '2024-01-15',
              duration: 2
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 15,
        total_tokens: 35
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        event: z.object({
          title: z.string().min(5).max(50).describe('Event title between 5-50 characters'),
          attendees: z.number().min(1).max(100).describe('Number of attendees between 1-100'),
          date: z.string().describe('Event date in YYYY-MM-DD format'),
          duration: z.number().min(0.5).max(8).describe('Duration in hours between 0.5-8')
        })
      }),
      prompt: "Generate a 2-hour workshop event for 25 people happening on 2024-01-15"
    });

    expect(object.event.title.length).toBeGreaterThanOrEqual(5);
    expect(object.event.title.length).toBeLessThanOrEqual(50);
    expect(object.event.attendees).toBe(25);
    expect(object.event.attendees).toBeGreaterThanOrEqual(1);
    expect(object.event.attendees).toBeLessThanOrEqual(100);
    expect(object.event.date).toContain('2024-01-15');
    expect(object.event.duration).toBe(2);
  });

  it('should maintain response format consistency with OpenAI structured output', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-response-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            test: {
              value: 'success'
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    }) as any);

    const { object, response } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        test: z.object({
          value: z.string()
        })
      }),
      prompt: "Generate a test object with value 'success'"
    });

    // Verify the object structure
    expect(object.test.value).toBe('success');

    // Verify response metadata exists (like OpenAI/OpenRouter)
    expect(response).toBeDefined();
    expect(typeof response.id).toBe('string');
  });
});
