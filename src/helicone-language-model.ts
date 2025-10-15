import {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
} from '@ai-sdk/provider';
import { HeliconeSettings, HeliconeExtraBody } from './types';
import { convertToHeliconePrompt } from './convert-to-helicone-prompt';
import {
  HeliconeErrorData,
  mapHeliconeFinishReason,
  createHeliconeError,
} from './helicone-error';

type HeliconeLanguageModelConfig = {
  modelId: string;
  settings: HeliconeSettings;
  extraBody?: HeliconeExtraBody;
};

export class HeliconeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2' as const;
  readonly supportedUrls: Record<string, RegExp[]> = {};
  readonly provider: string = 'helicone';
  readonly modelId: string;
  private readonly settings: HeliconeSettings;
  private readonly extraBody?: HeliconeExtraBody;

  constructor(config: HeliconeLanguageModelConfig) {
    this.modelId = config.modelId;
    this.settings = config.settings;
    this.extraBody = config.extraBody;
  }

  private get baseURL(): string {
    return this.settings.baseURL ?? 'https://ai-gateway.helicone.ai';
  }

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.settings.headers || {}),
    };

    if (this.settings.apiKey) {
      headers['Authorization'] = `Bearer ${this.settings.apiKey}`;
    }

    return headers;
  }

  private buildRequestBody(options: LanguageModelV2CallOptions): any {
    const prompt = convertToHeliconePrompt(options.prompt);

    const body: any = {
      model: this.modelId,
      messages: prompt,
      stream: false,
      ...(options.temperature != null && { temperature: options.temperature }),
      ...(options.maxOutputTokens != null && { max_tokens: options.maxOutputTokens }),
      ...(options.topP != null && { top_p: options.topP }),
      ...(options.topK != null && { top_k: options.topK }),
      ...(options.frequencyPenalty != null && { frequency_penalty: options.frequencyPenalty }),
      ...(options.presencePenalty != null && { presence_penalty: options.presencePenalty }),
      ...(options.stopSequences != null && { stop: options.stopSequences }),
      ...(options.seed != null && { seed: options.seed }),
      ...this.extraBody,
    };

    if (options.toolChoice) {
      if (options.toolChoice.type === 'auto') {
        body.tool_choice = 'auto';
      } else if (options.toolChoice.type === 'required') {
        body.tool_choice = 'required';
      } else if (options.toolChoice.type === 'none') {
        body.tool_choice = 'none';
      } else if (options.toolChoice.type === 'tool') {
        body.tool_choice = {
          type: 'function',
          function: { name: options.toolChoice.toolName },
        };
      }
    }

    if (options.tools) {
      body.tools = options.tools.map((tool: any) => ({
        type: 'function',
        function: {
          name: tool.name || tool.toolName,
          description: tool.description || '',
          parameters: tool.inputSchema || tool.parameters || {},
        },
      }));
    }

    return body;
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const body = this.buildRequestBody(options);

    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorData: HeliconeErrorData = {};

        try {
          errorData = JSON.parse(errorText);
        } catch {
          // If not JSON, put the raw text in the error message
          errorData = {
            error: {
              message: errorText || `HTTP ${response.status}: ${response.statusText}`,
              type: 'http_error',
              code: response.status.toString(),
            },
          };
        }

        console.error('Helicone API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData,
          responseText: errorText,
        });

        throw createHeliconeError({
          data: errorData,
          response,
        });
      }

      const data: any = await response.json();

      const choice = data.choices[0];
      const message = choice.message;

      const content: Array<any> = [];

      if (message.content) {
        content.push({
          type: 'text',
          text: message.content
        });
      }

      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          content.push({
            type: 'tool-call',
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments)
          });
        }
      }

      return {
        content,
        finishReason: mapHeliconeFinishReason(choice.finish_reason),
        usage: {
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          totalTokens: data.usage?.total_tokens ?? (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0)
        },
        warnings: []
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      throw createHeliconeError({
        message: `Failed to generate response: ${error}`,
        cause: error,
      });
    }
  }

  async doStream(options: LanguageModelV2CallOptions) {
    const body = { ...this.buildRequestBody(options), stream: true };

    try {
      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as HeliconeErrorData;
        throw createHeliconeError({
          data: errorData,
          response,
        });
      }

      let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

      return {
        stream: this.createStreamFromResponse(response, usage),
        rawCall: { rawPrompt: body.messages, rawSettings: body },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      throw createHeliconeError({
        message: `Failed to stream response: ${error}`,
        cause: error,
      });
    }
  }

  private createStreamFromResponse(
    response: Response,
    usage: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): ReadableStream<LanguageModelV2StreamPart> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();

    return new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith('data: ')) continue;

              const data = trimmedLine.slice(6);
              if (data === '[DONE]') {
                controller.enqueue({
                  type: 'finish',
                  finishReason: 'stop' as LanguageModelV2FinishReason,
                  usage,
                });
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const choice = parsed.choices?.[0];

                if (!choice) continue;

                if (choice.finish_reason) {
                  controller.enqueue({
                    type: 'finish',
                    finishReason: mapHeliconeFinishReason(choice.finish_reason),
                    usage,
                  });
                  return;
                }

                const delta = choice.delta;
                if (delta?.content) {
                  controller.enqueue({
                    type: 'text-delta',
                    id: 'text',
                    delta: delta.content,
                  });
                }

                if (delta?.tool_calls) {
                  for (const toolCall of delta.tool_calls) {
                    if (toolCall.function?.name) {
                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: toolCall.id,
                        toolName: toolCall.function.name,
                        args: JSON.parse(toolCall.function.arguments || '{}'),
                      } as any);
                    }
                  }
                }

                if (parsed.usage) {
                  usage.inputTokens = parsed.usage.prompt_tokens || 0;
                  usage.outputTokens = parsed.usage.completion_tokens || 0;
                  usage.totalTokens = parsed.usage.total_tokens || (usage.inputTokens + usage.outputTokens);
                }
              } catch (parseError) {
                // Ignore parse errors for individual chunks
                continue;
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  }
}
