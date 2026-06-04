import { defineConfig } from 'vite';
import uniPluginModule from '@dcloudio/vite-plugin-uni';

const uni = (uniPluginModule as unknown as { default?: () => unknown }).default ?? (uniPluginModule as unknown as () => unknown);

export default defineConfig({
  plugins: [uni()],
  server: {
    host: '127.0.0.1',
    port: 5174
  },
  test: {
    environment: 'node'
  }
});
