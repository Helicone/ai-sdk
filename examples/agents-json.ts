import { createHelicone } from "@helicone/ai-sdk-provider";
import { Experimental_Agent as Agent, tool, jsonSchema, stepCountIs } from "ai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Initialize the Helicone provider
  const helicone = createHelicone({
    apiKey: process.env.HELICONE_API_KEY!,
  });

  console.log("Testing Agent integration with Helicone...\n");

  // Create an Agent with Helicone model
  const weatherAgent = new Agent({
    model: helicone("grok-4-fast-non-reasoning", {
      extraBody: {
        helicone: {
          sessionId: "agent-demo-" + Date.now(),
          properties: {
            example: "agents",
            feature: "weather-agent",
          },
          tags: ["agent", "demo", "weather"],
        },
      },
    }),
    system:
      "You are a helpful weather assistant. When asked about weather, use the getWeather tool to provide accurate information.",
    stopWhen: stepCountIs(5),
    tools: {
      getWeather: tool({
        description: "Get the current weather for a location",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "The city and state, e.g. San Francisco, CA",
            },
            unit: {
              type: "string",
              enum: ["celsius", "fahrenheit"],
              default: "fahrenheit",
              description: "Temperature unit",
            },
          },
          required: ["location"],
        }),
        execute: async ({ location, unit }) => {
          // Simulate weather API call
          const temp =
            unit === "celsius"
              ? Math.floor(Math.random() * 30 + 5)
              : Math.floor(Math.random() * 86 + 32);

          const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"][
            Math.floor(Math.random() * 4)
          ];

          const result = {
            location,
            temperature: temp,
            unit: unit || 'fahrenheit',
            conditions,
            description: `It's ${conditions} in ${location} with a temperature of ${temp}°${unit?.charAt(0).toUpperCase() || 'F'}.`
          };

          console.log(`Result: ${JSON.stringify(result)}`);
          return result;
        },
      }),

      calculateWindChill: tool({
        description: "Calculate wind chill temperature",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            temperature: {
              type: "number",
              description: "Temperature in Fahrenheit",
            },
            windSpeed: {
              type: "number",
              description: "Wind speed in mph",
            },
          },
          required: ["temperature", "windSpeed"],
        }),
        execute: async ({ temperature, windSpeed }) => {
          const windChill =
            35.74 +
            0.6215 * temperature -
            35.75 * Math.pow(windSpeed, 0.16) +
            0.4275 * temperature * Math.pow(windSpeed, 0.16);

          const result = {
            temperature,
            windSpeed,
            windChill: Math.round(windChill),
            description: `With a temperature of ${temperature}°F and wind speed of ${windSpeed} mph, the wind chill feels like ${Math.round(windChill)}°F.`
          };

          console.log(`Result: ${JSON.stringify(result)}`);
          return result;
        },
      }),
    },
  });

  try {
    console.log("🌤️  Asking about weather in multiple cities...\n");

    const result = await weatherAgent.generate({
      prompt:
        "What is the weather like in San Francisco, CA and New York, NY? Also, if the wind speed in San Francisco is 15 mph, what would the wind chill feel like?"
    });

    console.log("=== Agent Response ===");
    console.log(result.text);

    console.log("\n=== Usage Statistics ===");
    console.log(`Total tokens: ${result.usage?.totalTokens || "N/A"}`);
    console.log(`Finish reason: ${result.finishReason}`);
    console.log(`Steps taken: ${result.steps?.length || 0}`);

    if (result.steps && result.steps.length > 0) {
      console.log("\n=== Steps Breakdown ===");
      result.steps.forEach((step, index) => {
        console.log(`Step ${index + 1}: ${step.finishReason}`);
        if (step.toolCalls && step.toolCalls.length > 0) {
          console.log(
            `  Tool calls: ${step.toolCalls.map((tc) => tc.toolName).join(", ")}`
          );
          step.toolCalls.forEach((tc, i) => {
            console.log(
              `    Tool ${i + 1}: ${tc.toolName}(${JSON.stringify(tc.input)})`
            );
          });
        }
      });
    }

    console.log("\n✅ Agent integration successful!");
    console.log("Check your Helicone dashboard to see:");
    console.log("  - Agent conversation with multiple model calls");
    console.log("  - Tool usage tracking");
    console.log("  - Session grouping with custom properties");
    console.log("  - Token usage across all agent steps");
  } catch (error) {
    console.error("❌ Error running agent:", error);

    if (error instanceof Error) {
      console.error("Error details:", error.message);
    }
  }
}

main().catch(console.error);
