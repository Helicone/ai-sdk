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
  return prompt.map((message: any) => {
    switch (message.role) {
      case 'system':
        return {
          role: 'system' as const,
          content: message.content,
        };

      case 'user':
        return {
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
                    image_url: { url: part.data.toString() },
                  };
                }
                // Handle base64 or binary data
                const data = typeof part.data === 'string' ? part.data : Buffer.from(part.data).toString('base64');
                const mediaType = part.mediaType || 'image/jpeg';
                return {
                  type: 'image_url',
                  image_url: { url: `data:${mediaType};base64,${data}` },
                };
              default:
                throw new Error(`Unsupported content type: ${(part as any).type}`);
            }
          }),
        };

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
          }).filter(Boolean).join('') || undefined,
        };

        // Handle tool calls
        const toolCalls = message.content.filter((part: any) => part.type === 'tool-call');
        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls.map((part: any) => ({
            id: part.toolCallId,
            type: 'function' as const,
            function: {
              name: part.toolName,
              arguments: typeof part.input === 'string' ? part.input : JSON.stringify(part.input),
            },
          }));
        }

        return assistantMessage;

      case 'tool':
        return {
          role: 'tool' as const,
          content: message.content.map((part: any) => {
            switch (part.type) {
              case 'tool-result':
                // Handle the different output types
                const output = part.output;
                if (output.type === 'text' || output.type === 'error-text') {
                  return output.value;
                } else if (output.type === 'json' || output.type === 'error-json') {
                  return JSON.stringify(output.value);
                } else if (output.type === 'content') {
                  return output.value.map((item: any) => {
                    if (item.type === 'text') {
                      return item.text;
                    } else if (item.type === 'media') {
                      return `[Media: ${item.mediaType}]`;
                    }
                    return '';
                  }).join('');
                }
                return JSON.stringify(output);
              default:
                throw new Error(`Unsupported tool content type: ${(part as any).type}`);
            }
          }).join('\n'),
          tool_call_id: message.content[0]?.toolCallId,
        };

      default:
        throw new Error(`Unsupported message role: ${(message as any).role}`);
    }
  });
}