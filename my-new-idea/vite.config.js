import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Dev: serve from / so localhost:5177 works normally
  // Prod build: assets resolve under /boxing-coach/ on the unified hosting site
  base: command === 'build' ? '/boxing-coach/' : '/',
  build: {
    outDir: '../boxing-coach',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/firebase'))      return 'vendor-firebase'
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router-dom')) return 'vendor-react'
          if (id.includes('@mediapipe/tasks-vision'))    return 'vision_bundle'
        },
      },
    },
  },
}))
