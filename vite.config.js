const { defineConfig } = require('vite');

module.exports = defineConfig({
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
