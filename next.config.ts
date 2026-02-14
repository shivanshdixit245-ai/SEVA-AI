import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    // @ts-expect-error - buildActivity is deprecated in types but still works in some versions, or this is a type mismatch
    buildActivity: false,
    appIsrStatus: false,
  },
};

export default nextConfig;
