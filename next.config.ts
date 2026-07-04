import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_BASE_PATH ?? "/leads",
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
