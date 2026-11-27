import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Cache Components and partial prefetching
  // for the current client-side authentication layout.
  cacheComponents: false,
  partialPrefetching: false,

  // Retain Tailwind CSS configuration.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;