import { LanguageModelV2FinishReason } from '@ai-sdk/provider';

export interface HeliconeErrorData {
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

export class HeliconeError extends Error {
  readonly name = 'HeliconeError';
  readonly data?: HeliconeErrorData;
  readonly response?: Response;
  declare readonly cause?: unknown;

  constructor({
    message,
    data,
    response,
    cause,
  }: {
    message?: string;
    data?: HeliconeErrorData;
    response?: Response;
    cause?: unknown;
  }) {
    super(
      message ||
      data?.error?.message ||
      (response ? `HTTP ${response.status}: ${response.statusText}` : 'An error occurred')
    );

    this.data = data;
    this.response = response;

    if (cause) {
      (this as any).cause = cause;
    }
  }

  static isHeliconeError(error: unknown): error is HeliconeError {
    return error instanceof Error && error.name === 'HeliconeError';
  }
}

export function createHeliconeError({
  data,
  response,
  message,
  cause,
}: {
  data?: HeliconeErrorData;
  response?: Response;
  message?: string;
  cause?: unknown;
}): HeliconeError {
  return new HeliconeError({
    message,
    data,
    response,
    cause,
  });
}

export function mapHeliconeFinishReason(
  finishReason: string | null | undefined
): LanguageModelV2FinishReason {
  switch (finishReason) {
    case 'stop':
      return 'stop';
    case 'length':
    case 'max_tokens':
      return 'length';
    case 'content_filter':
      return 'content-filter';
    case 'tool_calls':
    case 'function_call':
      return 'tool-calls';
    case 'eos':
      return 'stop';
    default:
      return 'other';
  }
}
