import { ChatProvider } from "./providers";
import { ThetaProvider } from "./providers/theta";
import { VercelProvider } from "./providers/vercel";
import { pickModel } from "./models";

export function getProvider(): ChatProvider {
  // Default to Vercel if no environment override
  const envProvider = process.env.AI_PROVIDER as "theta" | "vercel" | undefined;

  if (envProvider === "theta") {
    if (!process.env.THETA_CLOUD_API_TOKEN) {
      throw new Error("THETA_CLOUD_API_TOKEN is required when AI_PROVIDER=theta");
    }
    return ThetaProvider;
  }

  return VercelProvider;
}

export function getProviderForModel(modelId: string): ChatProvider {
  console.log("🔌 Provider Detection Debug:");
  console.log("Model ID:", modelId);

  // Check if this is a Theta model
  const model = pickModel(modelId);
  console.log("Picked model:", model);

  if (model.provider === "theta") {
    console.log("🎯 Detected Theta model, checking API token...");
    if (!process.env.THETA_CLOUD_API_TOKEN) {
      console.error("❌ THETA_CLOUD_API_TOKEN is required for Theta models");
      throw new Error("THETA_CLOUD_API_TOKEN is required for Theta models");
    }
    console.log("✅ Using ThetaProvider");
    return ThetaProvider;
  }

  console.log("✅ Using VercelProvider");
  return VercelProvider;
}
