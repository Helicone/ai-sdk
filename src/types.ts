export interface HeliconeSettings {
  /**
   * Helicone API key for authentication
   */
  apiKey?: string;

  /**
   * Base URL for Helicone AI Gateway
   * @default "https://ai-gateway.helicone.ai"
   */
  baseURL?: string;

  /**
   * Additional headers to send with requests
   */
  headers?: Record<string, string>;

  /**
   * Custom fetch implementation
   */
  fetch?: typeof fetch;
}

export interface HeliconeProviderSettings extends HeliconeSettings {
  /**
   * Provider-specific API keys (e.g., OpenAI, Anthropic)
   */
  providerApiKeys?: Record<string, string>;
}

export interface HeliconeExtraBody {
  /**
   * Helicone-specific metadata
   */
  helicone?: {
    /**
     * Session ID for grouping related requests
     */
    sessionId?: string;

    /**
     * User ID for tracking user-specific requests
     */
    userId?: string;

    /**
     * Custom properties for request metadata
     */
    properties?: Record<string, any>;

    /**
     * Tags for categorizing requests
     */
    tags?: string[];

    /**
     * Enable/disable caching
     */
    cache?: boolean;

    /**
     * Retry configuration
     */
    retries?: {
      num?: number;
      factor?: number;
      min_timeout?: number;
      max_timeout?: number;
    };

    /**
     * Fallback models in case of failure
     */
    fallbacks?: Array<{
      provider: string;
      model: string;
    }>;
  };
}

export interface HeliconeModelSettings {
  /**
   * The model ID to use (e.g., "openai/gpt-4", "anthropic/claude-3-sonnet")
   */
  modelId: string;

  /**
   * Provider-specific API key
   */
  apiKey?: string;

  /**
   * Extra body parameters for Helicone
   */
  extraBody?: HeliconeExtraBody;
}

export type HeliconeProvider = string;

export interface HeliconeModelConfig extends HeliconeModelSettings {
  provider: HeliconeProvider;
}