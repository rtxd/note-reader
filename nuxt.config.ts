import tsconfigPaths from 'vite-tsconfig-paths'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],
  // Global CSS imported explicitly in app/app.vue to avoid alias resolution issues
  vite: {
    plugins: [tsconfigPaths()]
  },
  runtimeConfig: {
    // GitHub Personal Access Token (server-side only)
    githubPat: process.env.GITHUB_PAT
  }
})