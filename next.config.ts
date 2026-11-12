import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    // File mutasi bisa lebih besar dari batas bawaan 1 MB.
    serverActions: { bodySizeLimit: "20mb" },
  },
};

export default config;
