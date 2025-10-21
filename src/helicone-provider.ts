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
      fetch: config.fetch
    };
    this.defaultExtraBody = config.extraBody;
  }

  languageModel(
    modelId: string,
    settings?: {
      promptId?: string;
      inputs?: Record<string, any>;
      environment?: string;
      extraBody?: HeliconeExtraBody;
      apiKey?: string;
    }
  ): LanguageModelV2 {
    // Helicone AI Gateway accepts model names directly (e.g., "gpt-4", "claude-3-sonnet")
    // and handles provider selection on the backend
    // For Helicone AI Gateway, provider API keys are configured in Helicone account settings
    // We only pass through the headers from the main settings
    const headers = { ...this.settings.headers };

    // Build extraBody with prompt parameters if provided
    let extraBody = {
      ...this.defaultExtraBody,
      ...settings?.extraBody,
    };

    // Add prompt parameters to top level of extraBody if using prompts
    if (settings?.promptId) {
      extraBody = {
        ...extraBody,
        prompt_id: settings.promptId,
        ...(settings.inputs && { inputs: settings.inputs }),
        ...(settings.environment && { environment: settings.environment }),
      };
    }

    return new HeliconeLanguageModel({
      modelId,
      settings: {
        ...this.settings,
        headers,
      },
      extraBody,
    });
  }

  textEmbeddingModel(modelId: string): never {
    throw new Error(`Text embedding model '${modelId}' is not supported by this Helicone provider`);
  }

  imageModel(modelId: string): never {
    throw new Error(`Image model '${modelId}' is not supported by this Helicone provider`);
  }
}

interface ModelSettings {
  promptId?: string;
  inputs?: Record<string, any>;
  environment?: string;
  extraBody?: HeliconeExtraBody;
  apiKey?: string;
}

export function createHelicone(config: HeliconeProviderConfig = {}) {
  const provider = new HeliconeProvider(config);

  return function heliconeModel(
    modelId: string,
    settings?: ModelSettings
  ): LanguageModelV2 {
    return provider.languageModel(modelId, settings);
  };
}
