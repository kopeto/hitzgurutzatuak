import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isWithin(directory, file) {
  const relative = path.relative(directory, file);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function reloadServerRenderedFiles() {
  const publicDir = path.join(__dirname, 'public');
  const buildDir = path.join(publicDir, 'react');
  const viewsDir = path.join(__dirname, 'views');

  return {
    name: 'reload-server-rendered-files',
    apply: 'serve',
    configureServer(server) {
      server.watcher.add([publicDir, viewsDir]);
    },
    handleHotUpdate({ file, server }) {
      const changedPublicAsset = isWithin(publicDir, file) && !isWithin(buildDir, file);
      if (!changedPublicAsset && !isWithin(viewsDir, file)) return;

      server.ws.send({ type: 'full-reload', path: '*', triggeredBy: file });
      return [];
    }
  };
}

export default defineConfig({
  plugins: [react(), reloadServerRenderedFiles()],
  publicDir: false,
  build: {
    outDir: 'public/react',
    emptyOutDir: true,
    rollupOptions: {
      input: 'client/index.html',
      output: {
        entryFileNames: 'main.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
