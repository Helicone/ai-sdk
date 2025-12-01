import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

async function testStreamText() {
  console.log("🧪 Testing streamText with textStream...\n");

  const result = streamText({
    model: helicone("gpt-4o-mini", {
      extraBody: {
        helicone: {
          tags: ["simple-stream-test"],
          properties: {
            test: "textStream",
          },
        },
      },
    }),
    prompt: "Write a haiku about AI streaming.",
  });

  console.log("📡 Consuming textStream:");

  // This should work according to AI SDK docs
  for await (const textChunk of result.textStream) {
    process.stdout.write(textChunk);
  }

  console.log("\n\n✅ textStream completed!");
}

async function testToUIMessageStreamResponse() {
  console.log("\n🧪 Testing toUIMessageStreamResponse...\n");

  const result = streamText({
    model: helicone("gpt-4o-mini", {
      extraBody: {
        helicone: {
          tags: ["simple-stream-test"],
          properties: {
            test: "toUIMessageStreamResponse",
          },
        },
      },
    }),
    prompt: 'Say "Hello streaming world!"',
  });

  const response = result.toUIMessageStreamResponse();
  console.log("✅ toUIMessageStreamResponse() created successfully!");
  console.log(
    "Response headers:",
    Object.fromEntries(response.headers.entries())
  );

  // Just check that we can create it - actual consumption needs to be in a server
  console.log("✅ toUIMessageStreamResponse test completed!");
}

// Run all tests
if (import.meta.url === `file://${process.argv[1]}`) {
  testStreamText()
    .then(() => testToUIMessageStreamResponse())
    .catch(console.error);
}

export { testStreamText, testToUIMessageStreamResponse };
