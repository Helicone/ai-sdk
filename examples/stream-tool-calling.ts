import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText, tool } from "ai";
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
        parameters: z.object({
          location: z
            .string()
            .describe("The city and state, e.g. San Francisco, CA"),
          unit: z
            .enum(["celsius", "fahrenheit"])
            .optional()
            .describe("Temperature unit"),
        }),
        execute: async ({ location, unit = "fahrenheit" }) => {
          return `The weather in ${location} is sunny and 72°${unit === "celsius" ? "C" : "F"}.`;
        },
      } as any),
      calculate: tool({
        description: "Perform a mathematical calculation",
        parameters: z.object({
          operation: z
            .enum(["add", "subtract", "multiply", "divide"])
            .describe("The mathematical operation to perform"),
          a: z.number().describe("First number"),
          b: z.number().describe("Second number"),
        }),
        execute: async ({ operation, a, b }) => {
          const ops = {
            add: a + b,
            subtract: a - b,
            multiply: a * b,
            divide: a / b,
          };
          return `${a} ${operation} ${b} = ${ops[operation]}`;
        },
      } as any),
    },
    maxRetries: 5,
  });

  console.log("\n=== Response ===");

  for await (const chunk of result.fullStream) {
    console.log(chunk);
  }

  console.log("\n\n=== Request Info ===");
  const usage = await result.usage;
  const finishReason = await result.finishReason;

  console.log(`Total tokens: ${usage.totalTokens}`);
  console.log(`Finish reason: ${finishReason}`);

  if (finishReason === "tool-calls") {
    console.log(
      "\n✓ Tool calling works! The model requested to use the defined tools."
    );
    console.log("Check your Helicone dashboard to see:");
    console.log("  - Tool definitions sent to the API");
    console.log("  - Tool calls requested by the model");
    console.log("  - Session tracking with custom properties and tags");
  } else {
    console.log("\n✓ Request completed successfully!");
  }
}

main().catch(console.error);
