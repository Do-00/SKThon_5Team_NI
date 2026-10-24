import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 서버 코드가 fs 로 읽는 JSON(법령·지원사업·인증 비교 데이터)을 배포 번들에 포함시킨다.
  // 경로를 문자열 조합으로 읽기 때문에 자동 추적이 놓칠 수 있다.
  outputFileTracingIncludes: {
    "/api/advisor": ["./src/data/*.json"],
    "/report/[buildingId]": ["./src/data/*.json"],
    "/guide/[buildingId]": ["./src/data/*.json"],
    "/search": ["./src/data/*.json"],
  },
};

export default nextConfig;
