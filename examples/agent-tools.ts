 import { createHelicone } from '@helicone/ai-sdk-provider';
  import { Experimental_Agent as Agent } from 'ai';
  import { z } from 'zod';
  import dotenv from 'dotenv';
  dotenv.config();

  // Create Helicone provider
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
    extraBody: {
      helicone: {
        sessionId: 'agent-demo-' + Date.now(),
        properties: {
          feature: 'agent-tool-calling'
        },
        tags: ['agent', 'tools']
      }
    }
  });

  // Create agent with tools
  const agent = new Agent({
    model: helicone("gemini-3-pro-preview"),
    system:
      "You are a customer support AI assistant. Your goal is to assist customers with their questions and issues. You are also able to use tools to help you with your tasks.",
    tools: {
      explore_knowledge_base: {
        description:
          "Search the knowledge base for products, guidelines, policies,  FAQs, and promotions. Use this to find information about products (names, prices,availability), company policies (returns, shipping), FAQs, procedures, and discount/promo codes.",
        inputSchema: z.object({
          query: z
            .string()
            .describe(
              "Search query to find relevant information. Be as specific as possible about what information is needed."
            ),
        }),
        execute: async ({ query }) => {
          // Your knowledge base search implementation
          return `Found information about: ${query}`;
        },
      },
      check_workflow: {
        description:
          "Check if there's a workflow available for the customer's action-oriented request.",
        inputSchema: z.object({
          action_intent: z
            .string()
            .describe(
              'Clear description of what action the customer wants to take (e.g., "return order", "track shipment", "cancel order")'
            ),
        }),
        execute: async ({ action_intent }) => {
          // Your workflow check implementation
          return `Workflow available for: ${action_intent}`;
        },
      },
      escalate_ticket: {
        description:
          "Escalate the ticket to a human agent. Use this when the customer explicitly requests to speak to a human, or when the issue is too complex to handle automatically.",
        inputSchema: z.object({
          reason: z
            .string()
            .describe(
              "Detailed reason for escalation that thoroughly explains why the ticket needs human intervention"
            ),
          contact: z
            .object({
              email: z.string().email().optional(),
              phone: z.string().optional(),
              firstname: z.string().optional(),
              lastname: z.string().optional(),
            })
            .describe(
              "Contact information - must provide at least email OR phone"
            ),
        }),
        execute: async ({ reason, contact }) => {
          // Your escalation implementation
          return `Ticket escalated: ${reason}`;
        },
      },
    },
  });

  // Example usage
  async function handleCustomerQuery() {
    try {
      const result = await agent.generate({
        prompt: [
          {
            role: 'user',
            content: [{ type: 'text', text: 'do you have peppermint oil??' }]
          }
        ]
      });

      console.log('=== Agent Response ===');
      console.log(result.text);

      console.log('\n=== Usage Statistics ===');
      console.log(`Total tokens: ${result.usage?.totalTokens || 'N/A'}`);
      console.log(`Finish reason: ${result.finishReason}`);
      console.log(`Steps taken: ${result.steps?.length || 0}`);

      if (result.steps && result.steps.length > 0) {
        console.log('\n=== Steps Breakdown ===');
        result.steps.forEach((step, index) => {
          console.log(`\nStep ${index + 1}: ${step.finishReason}`);

          if (step.toolCalls && step.toolCalls.length > 0) {
            console.log(`Tool calls: ${step.toolCalls.map((tc) => tc.toolName).join(', ')}`);
            step.toolCalls.forEach((tc, i) => {
              console.log(`\n Tool ${i + 1}: ${tc.toolName}`);
              console.log(`Input: ${JSON.stringify(tc.input, null, 2)}`);
            });
          }

          if (step.toolResults && step.toolResults.length > 0) {
            console.log(`Tool results: ${step.toolResults.length}`);
            step.toolResults.forEach((tr, i) => {
              console.log(`\n Result ${i + 1}: ${tr.toolName}`);
              // Log the entire tool result object for review
              console.log(`Full result: ${JSON.stringify(tr, null, 2)}`);
            });
          }
        });
      }

    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  }

  handleCustomerQuery();
