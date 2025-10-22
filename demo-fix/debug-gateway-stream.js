// Direct streaming gateway test
// Use Node.js built-in fetch
import { config } from 'dotenv';

config();

const testGatewayStreamingDirectly = async () => {
  console.log('Testing Helicone AI Gateway streaming directly...');

  const requestBody = {
    "model": "gpt-4o-mini",
    "stream": true, // Streaming
    "messages": [
      {
        "role": "user",
        "content": "What is the weather like in San Francisco?"
      }
    ],
    "tool_choice": "auto",
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "getWeather",
          "description": "Get the weather in a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The location to get the weather for"
              }
            },
            "required": ["location"],
            "additionalProperties": false
          }
        }
      }
    ]
  };

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.HELICONE_API_KEY}`,
  };

  console.log('Streaming Request...');

  try {
    const response = await fetch('https://ai-gateway.helicone.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.body) {
      console.error('No response body');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    console.log('\n=== Raw Streaming Data ===');
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      console.log('Raw chunk:', chunk);

      const lines = chunk.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data: ')) continue;

        const data = trimmedLine.slice(6);
        if (data === '[DONE]') {
          console.log('Stream finished');
          return;
        }

        try {
          const parsed = JSON.parse(data);
          console.log('Parsed data:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Failed to parse:', data);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
};

testGatewayStreamingDirectly();