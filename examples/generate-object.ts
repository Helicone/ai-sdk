import { generateObject } from "ai";
import { createHelicone } from "@helicone/ai-sdk-provider";
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY
});

const { object } = await generateObject({
  model: helicone("gpt-4o-mini"),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.string()),
      steps: z.array(z.string()),
    }),
  }),
  prompt: "Generate a lasagna recipe. Return a JSON object with the recipe",
});

console.log(JSON.stringify(object, null, 2));
