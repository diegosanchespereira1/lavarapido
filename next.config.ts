import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@lava-rapido/shared", "@lava-rapido/api-client"],
};

export default nextConfig;
