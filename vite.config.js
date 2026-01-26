import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  proxy: {
    "/api": "http://localhost:3000"
  },
  build: {
    outDir: 'dist', // default output folder for build
  },
});