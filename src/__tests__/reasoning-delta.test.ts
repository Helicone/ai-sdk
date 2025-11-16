import { HeliconeProvider } from '../helicone-provider';

describe('Reasoning Delta Support', () => {
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

  it('should emit reasoning-delta events', async () => {
    const provider = new HeliconeProvider({
      apiKey: 'test-key',
    });

    const mockStream = new ReadableStream({
      start(controller) {
        // First chunk with reasoning
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"Step 1: "},"finish_reason":null}]}\n\n'
          )
        );
        // Second chunk with more reasoning
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"Analyzing the problem."},"finish_reason":null}]}\n\n'
          )
        );
        // Third chunk with content
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Here is the answer."},"finish_reason":null}]}\n\n'
          )
        );
        // Final chunk with finish reason
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const model = provider.languageModel('o1');

    const result = await model.doStream({
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'Solve this problem' }],
        },
      ],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Verify reasoning-delta events
    const reasoningDeltas = chunks.filter((c) => c.type === 'reasoning-delta');
    expect(reasoningDeltas.length).toBe(2);

    expect(reasoningDeltas[0]).toEqual({
      type: 'reasoning-delta',
      delta: 'Step 1: ',
      id: 'reasoning-0',
    });

    expect(reasoningDeltas[1]).toEqual({
      type: 'reasoning-delta',
      delta: 'Analyzing the problem.',
      id: 'reasoning-0',
    });

    // Verify text-delta event
    const textDeltas = chunks.filter((c) => c.type === 'text-delta');
    expect(textDeltas.length).toBe(1);
    expect(textDeltas[0]).toEqual({
      type: 'text-delta',
      delta: 'Here is the answer.',
      id: 'text-0',
    });

    // Verify finish event
    const finishChunk = chunks[chunks.length - 1];
    expect(finishChunk.type).toBe('finish');
    expect(finishChunk.usage).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
    });
  });

  it('should handle reasoning without text content', async () => {
    const provider = new HeliconeProvider({
      apiKey: 'test-helicone-key',
    });

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"Only reasoning here"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":10,"total_tokens":15}}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const model = provider.languageModel('o1');

    const result = await model.doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Think about this' }] }],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Should have reasoning events but no text events
    expect(chunks.some((c) => c.type === 'reasoning-delta')).toBe(true);
    expect(chunks.some((c) => c.type === 'text-delta')).toBe(false);
  });

  it('should handle text content without reasoning', async () => {
    const provider = new HeliconeProvider({
      apiKey: 'test-helicone-key',
    });

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":5,"total_tokens":10}}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const model = provider.languageModel('gpt-4o');

    const result = await model.doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Say hello' }] }],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Should have text events but no reasoning events
    expect(chunks.some((c) => c.type === 'text-delta')).toBe(true);
    expect(chunks.some((c) => c.type === 'reasoning-delta')).toBe(false);
  });

  it('should handle reasoning and text content interleaved', async () => {
    const provider = new HeliconeProvider({
      apiKey: 'test-helicone-key',
    });

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"Thinking..."},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Answer: "},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"More thinking..."},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"42"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":15,"total_tokens":25}}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const model = provider.languageModel('o1');

    const result = await model.doStream({
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is the answer?' }],
        },
      ],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Verify both reasoning and text events are present
    expect(chunks.filter((c) => c.type === 'reasoning-delta').length).toBe(2);
    expect(chunks.filter((c) => c.type === 'text-delta').length).toBe(2);
  });

  it('should use consistent ID "reasoning-0" for all reasoning events', async () => {
    const provider = new HeliconeProvider({
      apiKey: 'test-helicone-key',
    });

    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":"First"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":" Second"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"reasoning":" Third"},"finish_reason":null}]}\n\n'
          )
        );
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":5,"total_tokens":10}}\n\n'
          )
        );
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      body: mockStream,
    });

    const model = provider.languageModel('o1');

    const result = await model.doStream({
      prompt: [{ role: 'user', content: [{ type: 'text', text: 'Test' }] }],
    });

    const chunks: any[] = [];
    const reader = result.stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // All reasoning events should have id: 'reasoning-0'
    const reasoningEvents = chunks.filter((c) => c.type === 'reasoning-delta');
    for (const event of reasoningEvents) {
      expect(event.id).toBe('reasoning-0');
    }
    expect(reasoningEvents.length).toBe(3);
  });
});
