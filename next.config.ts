import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // static HTML export — all API calls go to API Gateway
  trailingSlash: true,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
