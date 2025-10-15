import { LanguageModelV2, ProviderV2 } from '@ai-sdk/provider';
import { HeliconeLanguageModel } from './helicone-language-model';
import { HeliconeProviderSettings, HeliconeExtraBody } from './types';

export interface HeliconeProviderConfig extends HeliconeProviderSettings {
  /**
   * Default extra body parameters for all models
   */
  extraBody?: HeliconeExtraBody;
}

export class HeliconeProvider implements ProviderV2 {
  readonly specificationVersion = 'v2' as const;

  private settings: HeliconeProviderSettings;
  private defaultExtraBody?: HeliconeExtraBody;

  constructor(config: HeliconeProviderConfig = {}) {
    this.settings = {
      baseURL: config.baseURL ?? 'https://ai-gateway.helicone.ai',
      apiKey: config.apiKey,
      headers: config.headers,
      fetch: config.fetch,
      providerApiKeys: config.providerApiKeys,
    };
    this.defaultExtraBody = config.extraBody;
  }

  languageModel(
    modelId: string,
    settings?: {
      extraBody?: HeliconeExtraBody;
      apiKey?: string;
    }
  ): LanguageModelV2 {
    // Helicone AI Gateway accepts model names directly (e.g., "gpt-4", "claude-3-sonnet")
    // and handles provider selection on the backend
    // For Helicone AI Gateway, provider API keys are configured in Helicone account settings
    // We only pass through the headers from the main settings
    const headers = { ...this.settings.headers };

    return new HeliconeLanguageModel({
      modelId,
      settings: {
        ...this.settings,
        headers,
      },
      extraBody: {
        ...this.defaultExtraBody,
        ...settings?.extraBody,
      },
    });
  }

  textEmbeddingModel(modelId: string): never {
    throw new Error(`Text embedding model '${modelId}' is not supported by this Helicone provider`);
  }

  imageModel(modelId: string): never {
    throw new Error(`Image model '${modelId}' is not supported by this Helicone provider`);
  }
}

export function createHelicone(config: HeliconeProviderConfig = {}): HeliconeProvider {
  return new HeliconeProvider(config);
}
