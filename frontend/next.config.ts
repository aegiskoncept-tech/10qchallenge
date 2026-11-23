import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: "standalone",
  outputFileTracingRoot: path.resolve(projectRoot),
  serverExternalPackages: ["node:sqlite", "@electric-sql/pglite", "pg"],
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(projectRoot),
      '@/src': path.resolve(projectRoot, 'src'),
      '@/components': path.resolve(projectRoot, 'components'),
      '@/lib': path.resolve(projectRoot, 'lib'),
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
