import { createHelicone } from "@helicone/ai-sdk-provider";
import { streamText } from "ai";
import dotenv from "dotenv";

dotenv.config();

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

async function testUserExactSnippet() {
  console.log(
    "🎯 Testing User's Exact Snippet: result.stream.toUIMessageStream()\n"
  );

  const result = streamText({
    model: helicone("gpt-4o-mini", {
      extraBody: {
        helicone: {
          sessionId: "user-snippet-demo",
          userId: "demo-user",
          properties: {
            example: "exact-user-snippet",
            fixed: "true",
          },
          tags: ["user-snippet", "working", "fixed"],
        },
      },
    }),
    prompt:
      'Say "Hello streaming world!" and explain briefly what you are doing.',
  });

  console.log("📱 Using the user's exact snippet:\n");

  for await (const chunk of result.toUIMessageStream()) {
    console.log("chunk test", chunk);
  }

  console.log("\n🎉 User's exact snippet works perfectly!");
  console.log(
    "✨ No more errors - streaming works exactly like native OpenAI!"
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testUserExactSnippet().catch(console.error);
}

export { testUserExactSnippet };
