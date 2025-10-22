import { createOpenAI } from "@ai-sdk/openai";
import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText, tool } from "ai";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

async function main(provider: "openai" | "gateway" = "gateway") {
  // Validate environment variables
  if (!process.env.HELICONE_API_KEY) {
    console.error("❌ Error: HELICONE_API_KEY is required but not set.");
    console.error("   Please add your Helicone API key to your .env file:");
    console.error("   HELICONE_API_KEY=your-actual-helicone-api-key");
    console.error("\n   Get your API key from: https://us.helicone.ai/settings/keys");
    process.exit(1);
  }

  const gateway = createHelicone({
    apiKey: process.env.HELICONE_API_KEY,
  });

  const openai = createOpenAI({
    baseURL: "https://oai.helicone.ai/v1",
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
    messages: [
      {
        role: 'user',
        content: 'What is the weather like in San Francisco?',
      },
    ],
    tools: {
      getWeather: tool({
        description: "Get the weather in a location",
        inputSchema: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
    },
    maxRetries: 5,
  });

  console.log("\n=== Response ===");

  try {
    for await (const chunk of result.fullStream) {
      console.log(chunk);
    }

    // Wait for completion and get final result
    const finalResult = await result.text;
    console.log("\n=== Final Response ===");
    console.log(finalResult);

    console.log("\n=== Usage Info ===");
    const usage = await result.usage;
    console.log("Usage:", usage);

    console.log("\n=== Tool Calls ===");
    const toolCalls = await result.toolCalls;
    console.log("Tool Calls:", toolCalls);

    console.log("\n=== Tool Results ===");
    const toolResults = await result.toolResults;
    console.log("Tool Results:", toolResults);

  } catch (error) {
    console.error("\n=== Error Details ===");
    console.error("Error:", error);

    // Provide helpful error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        console.error("\n❌ Authentication Error:");
        console.error("   This error means your Helicone API key is invalid or missing.");
        console.error("\n   Solutions:");
        console.error("   1. Check that HELICONE_API_KEY is set in your .env file");
        console.error("   2. Verify your API key is correct at: https://us.helicone.ai/settings/keys");
        console.error("   3. Make sure you've configured your provider API keys in Helicone:");
        console.error("      https://us.helicone.ai/settings/providers");
        console.error("      (You need to add your OpenAI API key for gpt-4o-mini to work)");
      } else if (error.message.includes("403") || error.message.includes("Forbidden")) {
        console.error("\n❌ Permission Error:");
        console.error("   Your API key doesn't have permission to use this model or feature.");
        console.error("   Check your Helicone account limits and provider configurations.");
      } else if (error.message.includes("404")) {
        console.error("\n❌ Model Not Found:");
        console.error("   The model 'gpt-4o-mini' might not be available.");
        console.error("   Check available models at: https://helicone.ai/models");
      }
    }
  }
}

// Run the demo
const provider = (process.argv[2] as "openai" | "gateway") || "gateway";

main(provider).catch((error) => {
  console.error("\n=== Unhandled Error ===");
  console.error(error);
  process.exit(1);
});