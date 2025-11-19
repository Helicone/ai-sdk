import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText, tool, stepCountIs } from "ai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

async function main() {
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
  });

  console.log("Testing tool calling with Helicone...\n");

  const result = streamText({
    model: helicone("gpt-4o-mini", {
      extraBody: {
        helicone: {
          sessionId: "tool-calling-demo-" + Date.now(),
          properties: {
            example: "tool-calling",
            feature: "function-tools",
          },
          tags: ["tools", "demo"],
        },
      },
    }),
    prompt:
      "What is the weather like in San Francisco? Also, what is 42 multiplied by 17?",
    tools: {
      getWeather: tool({
        description: "Get the current weather for a location",
        inputSchema: z.object({
          location: z
            .string()
            .describe("The city and state, e.g. San Francisco, CA"),
          unit: z
            .enum(["celsius", "fahrenheit"])
            .optional()
            .describe("Temperature unit")
        }),
        execute: async ({ location, unit = "fahrenheit" }) => {
          return `The weather in ${location} is sunny and 72°${unit === "celsius" ? "C" : "F"}.`;
        }
      }),
      calculate: tool({
        description: "Perform a mathematical calculation",
        inputSchema: z.object({
          operation: z
            .enum(["add", "subtract", "multiply", "divide"])
            .describe("The mathematical operation to perform"),
          a: z.number().describe("First number"),
          b: z.number().describe("Second number")
        }),
        execute: async ({ operation, a, b }) => {
          const ops = {
            add: a + b,
            subtract: a - b,
            multiply: a * b,
            divide: a / b
          };
          return `${a} ${operation} ${b} = ${ops[operation]}`;
        }
      })
    },
    stopWhen: stepCountIs(5),
    maxRetries: 5,
  });

  console.log("\n=== Streaming Response ===\n");

  let textContent = "";

  for await (const chunk of result.fullStream) {
    if (chunk.type === "text-delta") {
      process.stdout.write(chunk.text);
      textContent += chunk.text;
    } else if (chunk.type === "tool-call") {
      console.log(`\n[Tool Call: ${chunk.toolName}]`);
    } else if (chunk.type === "tool-result") {
      console.log(`[Tool Result: ${chunk.toolName}] ${JSON.stringify(chunk.output)}`);
    }
  }

  console.log("\n\n=== Request Info ===");
  const usage = await result.usage;
  const finishReason = await result.finishReason;

  console.log(`Total tokens: ${usage.totalTokens}`);
  console.log(`Finish reason: ${finishReason}`);
  console.log(`Full text: ${textContent || "(no text generated)"}`);

  console.log("\n✓ Request completed successfully!");
  console.log("Check your Helicone dashboard to see:");
  console.log("  - Tool definitions sent to the API");
  console.log("  - Tool calls and executions");
  console.log("  - Session tracking with custom properties and tags");
}

main().catch(console.error);
