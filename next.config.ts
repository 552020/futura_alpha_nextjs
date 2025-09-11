import type { NextConfig } from "next/dist/server/config";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Load external .env from parent dir for dfx multi repo setup
const root = process.cwd();
const ICP_ENV_PATH = path.join(root, "..", "..", ".env");

if (fs.existsSync(ICP_ENV_PATH)) {
  dotenv.config({ path: ICP_ENV_PATH });
}

// Transform CANISTER_ and DFX_ variables to NEXT_PUBLIC_ for browser access
const ICP_PREFIXES = ["CANISTER_", "DFX_"];

// Map CANISTER_/DFX_ → NEXT_PUBLIC_*
const publicEnvEntries = Object.entries(process.env)
  .filter(([key]) => ICP_PREFIXES.some((p) => key.startsWith(p)))
  .map(([key, val]) => [`NEXT_PUBLIC_${key}`, String(val ?? "")]);

// Keep existing NEXT_PUBLIC_ variables
const passthroughEntries = Object.entries(process.env)
  .filter(([key]) => key.startsWith("NEXT_PUBLIC_"))
  .map(([key, val]) => [key, String(val ?? "")]);

// Process ICP environment variables for Next.js
const env: Record<string, string> = Object.fromEntries([...passthroughEntries, ...publicEnvEntries]);

const POSTHOG_INGEST_DOMAIN = process.env.NEXT_PUBLIC_POSTHOG_INGEST || "https://eu.i.posthog.com";
const POSTHOG_ASSETS_DOMAIN = process.env.NEXT_PUBLIC_POSTHOG_ASSETS || "https://eu-assets.i.posthog.com";

const isLocal = process.env.NEXT_PUBLIC_DFX_NETWORK === "local" || process.env.NODE_ENV !== "production";

if (isLocal && !env.NEXT_PUBLIC_CANISTER_ID_INTERNET_IDENTITY) {
  console.warn("Missing NEXT_PUBLIC_CANISTER_ID_INTERNET_IDENTITY");
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  experimental: {
    // Disable PPR for deployment compatibility
    ppr: false,
  },
  env: {
    ...env,
    NEXT_PUBLIC_II_URL:
      env.NEXT_PUBLIC_CANISTER_ID_INTERNET_IDENTITY &&
      (isLocal ? `http://${env.NEXT_PUBLIC_CANISTER_ID_INTERNET_IDENTITY}.localhost:4943/` : "https://id.ai"),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Keep generated imports working
      declarations: path.join(__dirname, "src/ic/declarations"),
      // Ensure a single instance of these packages
      "@dfinity/agent": require.resolve("@dfinity/agent"),
      "@dfinity/principal": require.resolve("@dfinity/principal"),
      "@dfinity/candid": require.resolve("@dfinity/candid"),
    };
    return config;
  },
  images: {
    unoptimized: true,
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/images/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/:path*",
        destination: `${POSTHOG_INGEST_DOMAIN}/ingest/:path*`,
      },
      {
        source: "/decide/:path*",
        destination: `${POSTHOG_INGEST_DOMAIN}/decide/:path*`,
      },
      {
        source: "/static/:path*",
        destination: `${POSTHOG_ASSETS_DOMAIN}/static/:path*`,
      },
      // ICP API proxy for local development
      {
        source: "/api/v2/:path*",
        destination: "http://127.0.0.1:4943/api/v2/:path*",
      },
    ];
  },
};

export default nextConfig;
