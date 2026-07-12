import type { NextConfig } from 'next'
import { fileURLToPath } from 'node:url'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this package so Next doesn't mistakenly pick up
  // an unrelated lockfile elsewhere on the machine.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
}

export default nextConfig
