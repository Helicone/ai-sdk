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

describe('generateObject', () => {
  let helicone: ReturnType<typeof createHelicone>;

  beforeEach(() => {
    jest.clearAllMocks();
    helicone = createHelicone({
      apiKey: 'test-key'
    });
  });

  it('should generate object with simple schema', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            name: 'Alice Johnson',
            age: 25,
            isStudent: true
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        name: z.string().describe('Person name'),
        age: z.number().describe('Person age'),
        isStudent: z.boolean().describe('Whether person is a student'),
      }),
      prompt: "Generate information about a 25-year-old student named Alice",
    });

    expect(object).toMatchObject({
      name: expect.any(String),
      age: expect.any(Number),
      isStudent: expect.any(Boolean),
    });

    expect(object.name).toContain('Alice');
    expect(object.age).toBe(25);
    expect(object.isStudent).toBe(true);
  });

  it('should generate object with complex nested schema', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            user: {
              name: 'John Doe',
              email: 'john.doe@example.com',
              profile: {
                bio: 'Software engineer with 5 years of experience',
                age: 30,
                preferences: {
                  theme: 'dark',
                  language: 'English'
                }
              }
            },
            metadata: {
              created: '2024-01-15T10:00:00Z',
              version: 1
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 15,
        completion_tokens: 25,
        total_tokens: 40
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        user: z.object({
          name: z.string(),
          email: z.string(),
          profile: z.object({
            bio: z.string(),
            age: z.number(),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              language: z.string(),
            }),
          }),
        }),
        metadata: z.object({
          created: z.string(),
          version: z.number(),
        }),
      }),
      prompt: "Generate a user profile for John Doe, age 30, who prefers dark theme and English language",
    });

    expect(object.user.name).toBe('John Doe');
    expect(object.user.profile.age).toBe(30);
    expect(object.user.profile.preferences.theme).toBe('dark');
    expect(object.user.profile.preferences.language).toContain('English');
    expect(typeof object.metadata.version).toBe('number');
  });

  it('should generate object with arrays', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            recipe: {
              name: 'Healthy Vegetarian Pasta',
              ingredients: ['pasta', 'tomatoes', 'olive oil', 'garlic', 'basil'],
              steps: ['Cook pasta', 'Sauté garlic', 'Add tomatoes', 'Mix with pasta', 'Serve hot'],
              tags: ['healthy', 'vegetarian']
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 20,
        total_tokens: 32
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        recipe: z.object({
          name: z.string(),
          ingredients: z.array(z.string()),
          steps: z.array(z.string()),
          tags: z.array(z.enum(['quick', 'healthy', 'vegetarian', 'vegan'])),
        }),
      }),
      prompt: "Generate a simple healthy vegetarian pasta recipe",
    });

    expect(typeof object.recipe.name).toBe('string');
    expect(Array.isArray(object.recipe.ingredients)).toBe(true);
    expect(Array.isArray(object.recipe.steps)).toBe(true);
    expect(Array.isArray(object.recipe.tags)).toBe(true);

    expect(object.recipe.ingredients.length).toBeGreaterThan(0);
    expect(object.recipe.steps.length).toBeGreaterThan(0);
    expect(object.recipe.tags).toContain('vegetarian');
    expect(object.recipe.tags).toContain('healthy');
  });

  it('should handle object generation with all required fields', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            product: {
              name: 'MacBook Pro',
              price: 1999,
              category: 'Electronics',
              inStock: true
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        product: z.object({
          name: z.string(),
          price: z.number(),
          category: z.string(),
          inStock: z.boolean(),
        }),
      }),
      prompt: "Generate a product listing for a laptop computer",
    });

    expect(typeof object.product.name).toBe('string');
    expect(typeof object.product.price).toBe('number');
    expect(typeof object.product.category).toBe('string');
    expect(typeof object.product.inStock).toBe('boolean');
  });

  it('should generate object with enum constraints', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            task: {
              title: 'Complete quarterly report',
              priority: 'high',
              status: 'todo',
              category: 'work'
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 12,
        completion_tokens: 10,
        total_tokens: 22
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-4o-mini"),
      schema: z.object({
        task: z.object({
          title: z.string(),
          priority: z.enum(['low', 'medium', 'high', 'urgent']),
          status: z.enum(['todo', 'in-progress', 'done']),
          category: z.enum(['work', 'personal', 'shopping']),
        }),
      }),
      prompt: "Generate a high-priority work task that needs to be done",
    });

    expect(typeof object.task.title).toBe('string');
    expect(['low', 'medium', 'high', 'urgent']).toContain(object.task.priority);
    expect(['todo', 'in-progress', 'done']).toContain(object.task.status);
    expect(['work', 'personal', 'shopping']).toContain(object.task.category);

    expect(object.task.priority).toBe('high');
    expect(object.task.category).toBe('work');
  });

  it('should work with different model names', async () => {
    mockFetch.mockResolvedValueOnce(createMockResponse({
      id: 'test-id',
      choices: [{
        message: {
          role: 'assistant',
          content: JSON.stringify({
            summary: {
              title: 'Benefits of Exercise',
              points: [
                'Improves cardiovascular health',
                'Strengthens muscles and bones',
                'Enhances mental well-being'
              ],
              wordCount: 15
            }
          })
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 8,
        completion_tokens: 12,
        total_tokens: 20
      }
    }) as any);

    const { object } = await generateObject({
      model: helicone("gpt-3.5-turbo"),
      schema: z.object({
        summary: z.object({
          title: z.string(),
          points: z.array(z.string()),
          wordCount: z.number(),
        }),
      }),
      prompt: "Summarize the benefits of exercise in 3 key points",
    });

    expect(typeof object.summary.title).toBe('string');
    expect(Array.isArray(object.summary.points)).toBe(true);
    expect(object.summary.points.length).toBe(3);
    expect(typeof object.summary.wordCount).toBe('number');
  });
});
