import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          about: path.resolve(__dirname, 'about.html'),
          experience: path.resolve(__dirname, 'experience.html'),
          qualifications: path.resolve(__dirname, 'qualifications.html'),
          onlineTuition: path.resolve(__dirname, 'online-tuition.html'),
          resources: path.resolve(__dirname, 'resources.html'),
          testimonials: path.resolve(__dirname, 'testimonials.html'),
          faq: path.resolve(__dirname, 'faq.html'),
          contact: path.resolve(__dirname, 'contact.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
