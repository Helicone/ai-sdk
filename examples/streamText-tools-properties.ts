import { createOpenAI } from "@ai-sdk/openai";
import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText, tool } from "ai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

async function main(provider: "openai" | "gateway" = "gateway") {
  const gateway = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
  });

  const openai = createOpenAI({
    baseURL: "https://ai-gateway.helicone.ai/v1",
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
    },
  });

  console.log(`Testing tool calling with ${provider}...\n`);

  const model =
    provider === "openai"
      ? openai("gpt-4o-mini")
      : gateway("gpt-4o-mini", {
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
        });

  const result = streamText({
    model,
    prompt: "What is the weather like in San Francisco?",
    tools: {
      weather: tool({
        description: "Get the weather in a location",
        inputSchema: z.object({
          location: z.string().describe("The city and state, e.g. San Francisco, CA")
        }),
        execute: async ({ location }) => {
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10
          };
        }
      }),
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

main('gateway').catch(console.error);

// // Get provider from command line argument, default to gateway
// const provider = (process.argv[2] as "openai" | "gateway") || "gateway";
// main(provider).catch(console.error);
