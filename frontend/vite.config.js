import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  plugins: [react()],
  build: {
    outDir: '../dist', 
  },
  server: {
    port: 5173,
  },
});
