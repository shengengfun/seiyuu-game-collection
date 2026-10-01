/**
 * 与主站共用的依赖清单。
 *
 * 每个游戏模块都独立构建，但必须和主站共用同一份 React / Router / i18n / SDK 实例，
 * 否则模块里的 `useContext` / `<Link>` 拿不到主站的上下文。
 *
 * 因此构建时把这些裸包名**外置**成站点绝对 URL（`/vendor/*.js`），
 * 运行时由主站 `public/vendor/` 提供（生产由 `scripts/build-vendor.mjs` 生成）。
 *
 * ⚠️ 这份表和主站 `scripts/build-vendor.mjs` 的 `VENDOR_ENTRIES` 必须保持一致；
 *    主站升级依赖版本后，跑一次 `node scripts/build-vendor.mjs --force` 即可，
 *    文件名是固定的，模块无需重新构建。
 */
export const SHARED_DEPS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  'react-router-dom',
  'i18next',
  'react-i18next',
  'zustand',
  'axios',
  'socket.io-client',
  '@seiyuu/shared',
  '@seiyuu/game-sdk',
];

/** 裸包名 → 站点绝对 URL。 */
export const SHARED_PATHS = {
  react: '/vendor/react.js',
  'react/jsx-runtime': '/vendor/react-jsx-runtime.js',
  'react-dom': '/vendor/react-dom.js',
  'react-dom/client': '/vendor/react-dom-client.js',
  'react-router-dom': '/vendor/react-router-dom.js',
  i18next: '/vendor/i18next.js',
  'react-i18next': '/vendor/react-i18next.js',
  zustand: '/vendor/zustand.js',
  axios: '/vendor/axios.js',
  'socket.io-client': '/vendor/socket-io-client.js',
  '@seiyuu/shared': '/vendor/seiyuu-shared.js',
  '@seiyuu/game-sdk': '/vendor/seiyuu-game-sdk.js',
};
