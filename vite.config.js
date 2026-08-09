import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  base: '/',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    minify: mode === 'production' ? 'terser' : false,
    terserOptions: mode === 'production' ? {
      compress: { drop_console: true, drop_debugger: true },
    } : undefined,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase'))      return 'vendor-firebase'
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) return 'vendor-react'
          if (id.includes('@mediapipe/tasks-vision'))    return 'vision_bundle'
          if (id.includes('@google/generative-ai'))      return 'vendor-gemini'
          if (id.includes('node_modules/'))              return 'vendor-misc'
        },
      },
    },
  },
}))
