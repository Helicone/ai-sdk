import { HeliconeError, createHeliconeError, mapHeliconeFinishReason } from '../helicone-error';

describe('HeliconeError', () => {
  it('should create error with message', () => {
    const error = new HeliconeError({ message: 'Test error' });

    expect(error.name).toBe('HeliconeError');
    expect(error.message).toBe('Test error');
    expect(error.data).toBeUndefined();
    expect(error.response).toBeUndefined();
  });

  it('should create error with data', () => {
    const data = {
      error: {
        message: 'API Error',
        type: 'invalid_request',
        code: 'invalid_api_key',
      },
    };
    const error = new HeliconeError({ data });

    expect(error.message).toBe('API Error');
    expect(error.data).toBe(data);
  });

  it('should create error with response', () => {
    const response = new Response(null, { status: 401, statusText: 'Unauthorized' });
    const error = new HeliconeError({ response });

    expect(error.message).toBe('HTTP 401: Unauthorized');
    expect(error.response).toBe(response);
  });

  it('should create error with cause', () => {
    const cause = new Error('Original error');
    const error = new HeliconeError({ message: 'Wrapped error', cause });

    expect(error.message).toBe('Wrapped error');
    expect(error.cause).toBe(cause);
  });

  it('should identify HeliconeError instances', () => {
    const error = new HeliconeError({ message: 'Test' });
    const regularError = new Error('Regular error');

    expect(HeliconeError.isHeliconeError(error)).toBe(true);
    expect(HeliconeError.isHeliconeError(regularError)).toBe(false);
    expect(HeliconeError.isHeliconeError('string')).toBe(false);
    expect(HeliconeError.isHeliconeError(null)).toBe(false);
  });
});

describe('createHeliconeError', () => {
  it('should create HeliconeError instance', () => {
    const error = createHeliconeError({ message: 'Test error' });

    expect(error).toBeInstanceOf(HeliconeError);
    expect(error.message).toBe('Test error');
  });
});

describe('mapHeliconeFinishReason', () => {
  it('should map stop reasons correctly', () => {
    expect(mapHeliconeFinishReason('stop')).toBe('stop');
    expect(mapHeliconeFinishReason('eos')).toBe('stop');
  });

  it('should map length reasons correctly', () => {
    expect(mapHeliconeFinishReason('length')).toBe('length');
    expect(mapHeliconeFinishReason('max_tokens')).toBe('length');
  });

  it('should map content filter reason correctly', () => {
    expect(mapHeliconeFinishReason('content_filter')).toBe('content-filter');
  });

  it('should map tool call reasons correctly', () => {
    expect(mapHeliconeFinishReason('tool_calls')).toBe('tool-calls');
    expect(mapHeliconeFinishReason('function_call')).toBe('tool-calls');
  });

  it('should map unknown reasons to other', () => {
    expect(mapHeliconeFinishReason('unknown')).toBe('other');
    expect(mapHeliconeFinishReason(null)).toBe('other');
    expect(mapHeliconeFinishReason(undefined)).toBe('other');
  });
});