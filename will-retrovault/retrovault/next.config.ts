import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add your local network IPs here for dev access from other devices on your LAN
  // e.g. allowedDevOrigins: ["192.168.1.100", "localhost", "127.0.0.1"],
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.1.158"],

};

export default nextConfig;
