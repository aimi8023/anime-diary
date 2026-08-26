import type { NextConfig } from "next";

// 站内所有 <Image> 均以 unoptimized 直接引用外部封面 URL，
// 不经过 Next.js 图片优化器，因此不需要 remotePatterns 白名单。
// 若未来引入优化后的远程图片，请在这里显式列出可信主机，
// 不要重新添加 "**" 通配符。
const nextConfig: NextConfig = {};

export default nextConfig;
