import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const headers = [
      {
        key: "Content-Security-Policy",
        value:
          "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), microphone=(self)",
      },
    ];
    if (process.env.NODE_ENV === "production")
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    return [{ source: "/:path*", headers }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    resolveAlias:{"@bible-strong/avatar-core":"./src/components/assistant/avatar-engine/index.js"},
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  webpack(config){config.resolve.alias["@bible-strong/avatar-core"]=path.resolve("./src/components/assistant/avatar-engine/index.js");return config;},
};

export default nextConfig;
