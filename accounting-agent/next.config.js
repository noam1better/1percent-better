/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 is a native module — keep it server-side only
  serverExternalPackages: ['better-sqlite3'],
};

module.exports = nextConfig;
