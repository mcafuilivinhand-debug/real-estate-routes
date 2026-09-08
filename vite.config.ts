import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';

export default defineConfig({
  base: '/real-estate-routes/',
  plugins: [tanstackStart({ spa: { enabled: true } }), tanstackRouter({ target: 'react', autoCodeSplitting: true }), react()],
});
