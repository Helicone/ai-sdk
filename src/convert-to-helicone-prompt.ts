import { LanguageModelV2Prompt } from '@ai-sdk/provider';

export interface HeliconeMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
}

export function convertToHeliconePrompt(
  prompt: LanguageModelV2Prompt
): HeliconeMessage[] {
  const messages: HeliconeMessage[] = [];

  for (const message of prompt) {
    switch (message.role) {
      case 'system':
        messages.push({
          role: 'system' as const,
          content: message.content
        });
        break;

      case 'user':
        messages.push({
          role: 'user' as const,
          content: message.content.map((part: any) => {
            switch (part.type) {
              case 'text':
                return { type: 'text', text: part.text };
              case 'file':
                // Handle file content (including images)
                if (part.data instanceof URL) {
                  return {
                    type: 'image_url',
                    image_url: { url: part.data.toString() }
                  };
                }
                // Handle base64 or binary data
                const data = typeof part.data === 'string' ? part.data : Buffer.from(part.data).toString('base64');
                const mediaType = part.mediaType || 'image/jpeg';
                return {
                  type: 'image_url',
                  image_url: { url: `data:${mediaType};base64,${data}` }
                };
              default:
                throw new Error(`Unsupported content type: ${(part as any).type}`);
            }
          })
        });
        break;

      case 'assistant':
        const assistantMessage: HeliconeMessage = {
          role: 'assistant' as const,
          content: message.content.map((part: any) => {
            switch (part.type) {
              case 'text':
                return part.text;
              case 'reasoning':
                return part.text;
              case 'tool-call':
                // Tool calls are handled separately
                return '';
              default:
                return '';
            }
          }).filter(Boolean).join('') || undefined
        };

        // Handle tool calls
        const toolCalls = message.content.filter((part: any) => part.type === 'tool-call');
        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls.map((part: any, index: number) => {
            const toolCall: any = {
              id: part.toolCallId,
              type: 'function' as const,
              function: {
                name: part.toolName,
                arguments: JSON.stringify(part.input)
              }
            };

            // Include Google thought signature if present
            // For sequential calls: each function call gets its signature
            // For parallel calls: only the first call gets the signature
            if (part.providerMetadata?.google?.thought_signature) {
              toolCall.extra_content = {
                google: {
                  thought_signature: part.providerMetadata.google.thought_signature
                }
              };
            }

            return toolCall;
          });
        }

        messages.push(assistantMessage);
        break;

      case 'tool':
        // Each tool result must be a separate message
        for (const part of message.content) {
          if (part.type === 'tool-result') {
            // Handle the different output types
            const output = part.output;
            let content: string;

            if (output.type === 'text' || output.type === 'error-text') {
              content = output.value;
            } else if (output.type === 'json' || output.type === 'error-json') {
              content = JSON.stringify(output.value);
            } else if (output.type === 'content') {
              content = output.value.map((item: any) => {
                if (item.type === 'text') {
                  return item.text;
                } else if (item.type === 'media') {
                  return `[Media: ${item.mediaType}]`;
                }
                return '';
              }).join('');
            } else {
              content = JSON.stringify(output);
            }

            messages.push({
              role: 'tool' as const,
              content,
              tool_call_id: part.toolCallId,
              name: part.toolName
            });
          } else {
            throw new Error(`Unsupported tool content type: ${(part as any).type}`);
          }
        }
        break;

      default:
        throw new Error(`Unsupported message role: ${(message as any).role}`);
    }
  }

  return messages;
}
