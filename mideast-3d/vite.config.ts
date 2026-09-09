import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GeoJSON files are served as static assets and fetched lazily per era,
// so they never enter the JavaScript bundle.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.geojson'],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber', '@react-three/drei'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
