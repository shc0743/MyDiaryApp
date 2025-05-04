import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue({
    template: {
      compilerOptions: {
        isCustomElement: (tag) => ['widget-caption', 'resizable-widget'].includes(tag)
      }
    }
  })],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      external: ["simple-web-encryption"],
    },
    chunkSizeWarningLimit: 4096
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2022' // 确保设置为支持 top-level await 的版本
    },
    exclude: [
      "simple-web-encryption",
    ]
  },
  base: '/webstatic/my-diary-app/'
})
