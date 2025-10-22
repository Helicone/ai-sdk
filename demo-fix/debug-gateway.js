// Direct gateway test to see raw response
import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const testGatewayDirectly = async () => {
  console.log('Testing Helicone AI Gateway directly...');

  const requestBody = {
    "model": "gpt-4o-mini",
    "stream": false, // Non-streaming first
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

  console.log('Request:', JSON.stringify(requestBody, null, 2));
  console.log('Headers:', JSON.stringify(headers, null, 2));

  try {
    const response = await fetch('https://ai-gateway.helicone.ai/v1/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('Response Body:', JSON.stringify(responseData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
};

testGatewayDirectly();