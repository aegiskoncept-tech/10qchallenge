import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ["node:sqlite", "@electric-sql/pglite", "pg"],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname),
      '@/src': path.resolve(__dirname, 'src'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
    };
    return config;
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/login/sign-in",
        destination: "/login",
        permanent: true,
      },
      {
        source: "/sign-up",
        destination: "/register",
        permanent: true,
      },
      {
        source: "/course-list",
        destination: "/course-all",
        permanent: true,
      },
      {
        source: "/student-index",
        destination: "/student/dashboard",
        permanent: true,
      },
      {
        source: "/student-course-list",
        destination: "/student/courses",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
