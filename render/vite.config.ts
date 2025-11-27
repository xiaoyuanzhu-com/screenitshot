import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        pdf: resolve(__dirname, 'src/templates/pdf.html'),
        test: resolve(__dirname, 'src/test/index.html'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
});
