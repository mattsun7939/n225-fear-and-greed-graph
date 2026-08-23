/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: ['100.115.92.195'],
  // Tailscale Serveのサブパス配下(/n225-fear-and-greed-graph)で配信する場合に、
  // _next/static配下のJS/CSSチャンクの取得元URLを切り替える。
  // basePathはTailscale Serveのプレフィックスstrip転送と非互換のため使わない
  // (basePathは「サーバー側もプレフィックス付きパスで受け取る」前提の機能)。
  // 未設定時(ローカル開発)は従来通りルート直下で動作する。
  assetPrefix: process.env.NEXT_ASSET_PREFIX || undefined,
};

export default nextConfig;
