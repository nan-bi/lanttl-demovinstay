import type { NextConfig } from "next";

// Toàn bộ đăng nhập/phân quyền nằm ở backend NestJS (backend/). FE gọi cùng origin `/api/v1/*` và Next
// chuyển tiếp sang backend — nhờ vậy cookie phiên httpOnly do backend set là first-party, không cần CORS.
const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // Có proxy.ts thì Next đệm body của MỌI request (kể cả rewrite sang backend) vào bộ nhớ, mặc định chỉ 10MB —
  // vượt là cắt cụt body và proxy lỗi 500. Tải ảnh ký gửi tối đa 8 ảnh × 3MB = 24MB (xem lib/landlord/photos.ts).
  experimental: { proxyClientMaxBodySize: "30mb" },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
