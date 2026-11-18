import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
        // Monitor before enforcing: PayPal/Klarna redirect/iframe flows must keep working.
        { key: "Content-Security-Policy-Report-Only", value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:; script-src 'self' https:; style-src 'self' 'unsafe-inline'" }
      ]
    }];
  }
};
export default nextConfig;
