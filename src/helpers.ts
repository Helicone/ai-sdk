/**
 * Type utility for Helicone prompt-based calls.
 *
 * When using `promptId` in the model configuration, the prompt comes from your
 * Helicone dashboard instead of the function parameter.
 *
 * **Important:** You must still pass an empty `messages` array or `prompt` to
 * satisfy the Vercel AI SDK's validation. The actual prompt content will be
 * fetched from your Helicone dashboard and the empty messages will be ignored.
 *
 * Cast your call to this type to satisfy TypeScript while keeping the code clean.
 *
 * @example
 * ```typescript
 * import { generateText } from 'ai';
 * import type { WithHeliconePrompt } from '@helicone/ai-sdk-provider';
 *
 * const result = await generateText({
 *   model: gateway.languageModel('gpt-4o', {
 *     promptId: 'my_prompt_v1',
 *     inputs: { name: 'Alice' }
 *   }),
 *   messages: [] // Required by AI SDK even when using Helicone prompts
 * } as WithHeliconePrompt);
 * ```
 */
export type WithHeliconePrompt = any;

