import { convertToHeliconePrompt } from '../convert-to-helicone-prompt';
import { LanguageModelV2Prompt } from '@ai-sdk/provider';

describe('convertToHeliconePrompt', () => {
  it('should convert system message', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
    ]);
  });

  it('should convert user message with text content', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello, world!' }],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'user',
        content: [{ type: 'text', text: 'Hello, world!' }],
      },
    ]);
  });

  it('should convert user message with image content', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'file',
            data: new URL('https://example.com/image.jpg'),
            mediaType: 'image/jpeg',
          },
        ],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.jpg' },
          },
        ],
      },
    ]);
  });

  it('should convert assistant message with text content', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! How can I help you?' }],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'assistant',
        content: 'Hello! How can I help you?',
      },
    ]);
  });

  it('should convert assistant message with tool calls', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Let me check the weather for you.' },
          {
            type: 'tool-call',
            toolCallId: 'call-123',
            toolName: 'getWeather',
            input: { location: 'San Francisco' },
          },
        ],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'assistant',
        content: 'Let me check the weather for you.',
        tool_calls: [
          {
            id: 'call-123',
            type: 'function',
            function: {
              name: 'getWeather',
              arguments: JSON.stringify({ location: 'San Francisco' }),
            },
          },
        ],
      },
    ]);
  });

  it('should convert tool message', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call-123',
            toolName: 'getWeather',
            output: { type: 'text', value: 'Sunny, 72°F' },
          },
        ],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'tool',
        content: 'Sunny, 72°F',
        tool_call_id: 'call-123',
        name: 'getWeather',
      },
    ]);
  });

  it('should handle empty content arrays', () => {
    const prompt: LanguageModelV2Prompt = [
      {
        role: 'assistant',
        content: [],
      },
    ];

    const result = convertToHeliconePrompt(prompt);

    expect(result).toEqual([
      {
        role: 'assistant',
        content: undefined,
      },
    ]);
  });

  it('should throw error for unsupported message role', () => {
    const messages = [
      {
        role: 'unknown',
        content: 'test',
      },
    ] as any;

    expect(() => convertToHeliconePrompt(messages)).toThrow(
      'Unsupported message role: unknown'
    );
  });
});