import { HeliconeProvider, createHelicone } from '../helicone-provider';
import { HeliconeLanguageModel } from '../helicone-language-model';

describe('HeliconeProvider', () => {
  describe('constructor', () => {
    it('should create provider with default settings', () => {
      const provider = new HeliconeProvider();
      expect(provider.specificationVersion).toBe('v2');
    });

    it('should create provider with custom settings', () => {
      const provider = new HeliconeProvider({
        apiKey: 'test-key',
        baseURL: 'https://custom.helicone.ai',
        providerApiKeys: {
          openai: 'sk-test',
        },
      });
      expect(provider.specificationVersion).toBe('v2');
    });
  });

  describe('languageModel', () => {
    it('should create language model with model name', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('gpt-4o');

      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect(model.specificationVersion).toBe('v2');
      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('gpt-4o');
    });

    it('should accept claude model names', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('claude-3.7-sonnet');

      expect(model).toBeInstanceOf(HeliconeLanguageModel);
      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('claude-3.7-sonnet');
    });

    it('should handle model names with version suffixes', () => {
      const provider = new HeliconeProvider();
      const model = provider.languageModel('gpt-4o-mini');

      expect(model.provider).toBe('helicone');
      expect(model.modelId).toBe('gpt-4o-mini');
    });
  });

  describe('createHelicone factory function', () => {
    it('should create HeliconeProvider instance', () => {
      const provider = createHelicone();
      expect(provider).toBeInstanceOf(HeliconeProvider);
    });

    it('should pass config to provider', () => {
      const config = {
        apiKey: 'test-key',
        baseURL: 'https://test.helicone.ai',
      };
      const provider = createHelicone(config);
      expect(provider).toBeInstanceOf(HeliconeProvider);
    });
  });
});
