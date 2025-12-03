import { createHelicone } from "@helicone/ai-sdk-provider";
import { Experimental_Agent as Agent, validateUIMessages, stepCountIs } from "ai";
import dotenv from "dotenv";

dotenv.config();

/**
 * This example demonstrates using validateUIMessages with Helicone provider.
 * This pattern is commonly used in API routes like app/api/chat/route.ts
 *
 * In AI SDK v6, UI messages use the `parts` array format instead of `content` string.
 */

// Initialize the Helicone provider
const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY!,
});

// Create an agent with Helicone model
const myAgent = new Agent({
  model: helicone("gpt-4o-mini", {
    extraBody: {
      helicone: {
        sessionId: "validate-ui-messages-test-" + Date.now(),
        properties: {
          app: "demo",
          example: "validate-ui-messages",
        },
        tags: ["agent", "validate-ui-messages", "api-route"],
      },
    },
  }),
  system: "You are a helpful assistant. Keep responses concise and friendly.",
  stopWhen: stepCountIs(3),
});

// Helper to convert validated UI messages to a prompt string for the agent
function messagesToPrompt(messages: Awaited<ReturnType<typeof validateUIMessages>>): string {
  return messages
    .map((msg) => {
      const parts = msg.parts
        .filter((part): part is { type: "text"; text: string } => part.type === "text")
        .map((part) => part.text)
        .join("");
      return `${msg.role}: ${parts}`;
    })
    .join("\n");
}

// Simulated API route handler (similar to app/api/chat/route.ts)
async function POST(request: { json: () => Promise<{ messages: unknown[] }> }) {
  const { messages } = await request.json();

  // Validate UI messages before passing to agent
  const validatedMessages = await validateUIMessages({ messages });

  // Convert validated messages to a prompt for the agent
  const prompt = messagesToPrompt(validatedMessages);

  return myAgent.generate({
    prompt,
  });
}

// Test the implementation
async function main() {
  console.log("Testing validateUIMessages with Helicone provider...\n");

  // Simulate incoming UI messages (as they would come from a frontend chat interface)
  // AI SDK v6 uses the `parts` array format for UI messages
  const simulatedUIMessages = [
    {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "Hello! Can you help me understand how validateUIMessages works?" }],
    },
  ];

  // Create a mock request object
  const mockRequest = {
    json: async () => ({ messages: simulatedUIMessages }),
  };

  try {
    console.log("📤 Simulated UI Messages:");
    console.log(JSON.stringify(simulatedUIMessages, null, 2));
    console.log("\n");

    // Call the simulated API route handler
    const response = await POST(mockRequest);

    console.log("📥 Agent Response:");
    console.log("Text:", response.text);
    console.log("\n");

    console.log("=== Response Details ===");
    console.log("Finish Reason:", response.finishReason);
    console.log("Total Tokens:", response.usage?.totalTokens || "N/A");
    console.log("Steps:", response.steps?.length || 0);

    console.log("\n✅ validateUIMessages test successful!");
    console.log("Check your Helicone dashboard to see the tracked request.");
  } catch (error) {
    console.error("❌ Error:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Stack:", error.stack);
    }
  }
}

// Test with multiple messages (conversation history)
async function testWithConversationHistory() {
  console.log("\n\n=== Testing with Conversation History ===\n");

  // AI SDK v6 uses the `parts` array format for UI messages
  const conversationMessages = [
    {
      id: "msg-1",
      role: "user",
      parts: [{ type: "text", text: "What's the capital of France?" }],
    },
    {
      id: "msg-2",
      role: "assistant",
      parts: [{ type: "text", text: "The capital of France is Paris." }],
    },
    {
      id: "msg-3",
      role: "user",
      parts: [{ type: "text", text: "And what about Germany?" }],
    },
  ];

  const mockRequest = {
    json: async () => ({ messages: conversationMessages }),
  };

  try {
    console.log("📤 Conversation Messages:");
    console.log(JSON.stringify(conversationMessages, null, 2));
    console.log("\n");

    const response = await POST(mockRequest);

    console.log("📥 Agent Response:");
    console.log("Text:", response.text);
    console.log("\n");

    console.log("=== Response Details ===");
    console.log("Finish Reason:", response.finishReason);
    console.log("Total Tokens:", response.usage?.totalTokens || "N/A");

    console.log("\n✅ Conversation history test successful!");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Test validation with edge cases
async function testValidation() {
  console.log("\n\n=== Testing validateUIMessages Validation ===\n");

  // AI SDK v6 uses the `parts` array format for UI messages
  // Test with various message formats that validateUIMessages should handle
  const testCases = [
    {
      name: "Simple text message with parts",
      messages: [
        {
          id: "1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
    },
    {
      name: "Message with multiple text parts",
      messages: [
        {
          id: "2",
          role: "user",
          parts: [
            { type: "text", text: "Hello, " },
            { type: "text", text: "how are you?" },
          ],
        },
      ],
    },
    {
      name: "Assistant message with reasoning",
      messages: [
        {
          id: "3",
          role: "assistant",
          parts: [
            { type: "reasoning", text: "Let me think about this..." },
            { type: "text", text: "Here's my response." },
          ],
        },
      ],
    },
  ];

  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);

    try {
      const validatedMessages = await validateUIMessages({
        messages: testCase.messages,
      });

      console.log("  ✅ Validation passed");
      console.log("  Validated messages:", JSON.stringify(validatedMessages, null, 4));
    } catch (error) {
      console.log("  ❌ Validation failed:", error instanceof Error ? error.message : error);
    }
    console.log("");
  }
}

// Run all tests
async function runTests() {
  await main();
  await testWithConversationHistory();
  await testValidation();
}

runTests().catch(console.error);
