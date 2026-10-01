import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { SHARED_DEPS, SHARED_PATHS } from './shared-deps.mjs';

/**
 * 小游戏模块的构建配置。
 *
 * 产物固定为：
 *   dist/index.js    模块入口（default 导出一个 React 组件）
 *   dist/style.css   模块样式（由主站在进入路由时按需注入）
 *   locales/*.json   模块自带文案（构建脚本原样拷进产物）
 *
 * 共享依赖全部外置到 `/vendor/*.js`，见 `shared-deps.mjs`。
 */
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    minify: true,
    cssCodeSplit: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.tsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'index.js',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: SHARED_DEPS,
      output: {
        paths: SHARED_PATHS,
      },
    },
  },
});
