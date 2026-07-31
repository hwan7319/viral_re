import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - 터널 및 외부 디바이스 접속 시 dev HMR 차단을 허용하기 위한 설정 (TypeScript 컴파일 무시)
  allowedDevOrigins: [
    "funny-adults-kick.loca.lt",
    "*.loca.lt",
    "118.130.203.245",
    "192.168.0.123",
    "172.16.0.178"
  ]
};

export default nextConfig;
