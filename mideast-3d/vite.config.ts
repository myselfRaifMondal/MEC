import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GeoJSON files are served as static assets and fetched lazily per era,
// so they never enter the JavaScript bundle.
// Served under /timeline/ on the shared Vercel project (see ../vercel.json);
// override with BASE_PATH=/ to host it at a domain root.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/timeline/',
  plugins: [react(), tailwindcss()],
  assetsInclude: ['**/*.geojson'],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          r3f: ['@react-three/fiber'],
        },
      },
    },
  },
});
