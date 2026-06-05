import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lain.bgm.tv" },
      { protocol: "https", hostname: "**.bgm.tv" },
      { protocol: "https", hostname: "**.anilist.co" },
      { protocol: "https", hostname: "**.myanimelist.net" },
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
