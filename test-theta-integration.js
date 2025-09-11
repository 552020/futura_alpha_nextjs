#!/usr/bin/env node

/**
 * Simple test script to verify Theta Cloud integration
 * Run with: node test-theta-integration.js
 *
 * Note: The integration now automatically switches providers based on model selection.
 * No need to set AI_PROVIDER environment variable - just select a Theta model in the UI!
 */

const BASE_URL = process.env.THETA_CLOUD_BASE_URL || "https://ondemand.thetaedgecloud.com";
const API_TOKEN = process.env.THETA_CLOUD_API_TOKEN;

if (!API_TOKEN) {
  console.error("❌ THETA_CLOUD_API_TOKEN environment variable is required");
  process.exit(1);
}

async function testThetaAPI() {
  console.log("🧪 Testing Theta Cloud API integration...");
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 API Token: ${API_TOKEN.substring(0, 10)}...`);

  try {
    const response = await fetch(`${BASE_URL}/infer_request/deepseek_r1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        input: {
          max_tokens: 100,
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant",
            },
            {
              role: "user",
              content: "What is Theta Network?",
            },
          ],
          stream: false,
          temperature: 0.5,
          top_p: 0.7,
        },
      }),
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", errorText);
      return false;
    }

    const data = await response.json();
    console.log("✅ API Response:", JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ Network Error:", error.message);
    return false;
  }
}

async function testStreaming() {
  console.log("\n🌊 Testing streaming...");

  try {
    const response = await fetch(`${BASE_URL}/infer_request/deepseek_r1/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({
        input: {
          max_tokens: 50,
          messages: [
            {
              role: "user",
              content: "Count from 1 to 5",
            },
          ],
          stream: true,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Streaming Error:", errorText);
      return false;
    }

    console.log(`📊 Streaming Status: ${response.status}`);
    console.log(`📋 Content-Type: ${response.headers.get("content-type")}`);

    const reader = response.body?.getReader();
    if (!reader) {
      console.error("❌ No stream reader available");
      return false;
    }

    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += new TextDecoder().decode(value, { stream: true });
      console.log("📦 Chunk:", buffer);
    }

    console.log("✅ Streaming completed");
    return true;
  } catch (error) {
    console.error("❌ Streaming Error:", error.message);
    return false;
  }
}

async function main() {
  console.log("🚀 Theta Cloud Integration Test");
  console.log("================================\n");

  const basicTest = await testThetaAPI();
  const streamingTest = await testStreaming();

  console.log("\n📊 Test Results:");
  console.log(`Basic API: ${basicTest ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Streaming: ${streamingTest ? "✅ PASS" : "❌ FAIL"}`);

  if (basicTest && streamingTest) {
    console.log("\n🎉 All tests passed! Theta Cloud integration is working.");
  } else {
    console.log("\n⚠️  Some tests failed. Check the errors above.");
    process.exit(1);
  }
}

main().catch(console.error);
