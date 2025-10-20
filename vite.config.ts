import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'chart-vendor': ['recharts'],
        'supabase-vendor': ['@supabase/supabase-js']
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false
  }
});