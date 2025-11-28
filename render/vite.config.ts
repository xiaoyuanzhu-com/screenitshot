import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteSingleFile } from 'vite-plugin-singlefile';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the input from command line argument or default to pdf
const input = process.env.VITE_INPUT || 'pdf';
const inputFile = resolve(__dirname, `${input}.html`);

export default defineConfig({
  plugins: [viteSingleFile()], // Inline all JS/CSS into HTML
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false, // Don't empty the dist dir on each build
    rollupOptions: {
      input: inputFile,
      output: {
        entryFileNames: `${input}.js`,
        assetFileNames: `${input}.[ext]`,
      },
    },
  },
});
