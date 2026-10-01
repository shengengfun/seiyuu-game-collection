import type { GameModuleManifest, GameModuleRegistry } from '@seiyuu/game-sdk';

/**
 * 运行时模块注册表。
 *
 * `apps/host/public/modules/registry.json` 由 `scripts/build-modules.mjs` 生成，
 * 列出当前可用的所有小游戏模块及其产物版本号。
 * 主站**不打包**任何游戏代码，进入路由时再去 `import()` 对应模块的入口脚本。
 */

const REGISTRY_URL = '/modules/registry.json';

let cache: GameModuleRegistry | null = null;
let inflight: Promise<GameModuleRegistry> | null = null;

function sortModules(modules: GameModuleManifest[]): GameModuleManifest[] {
  return [...modules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** 拉取注册表（同一页面生命周期内只请求一次）。 */
export function loadRegistry(force = false): Promise<GameModuleRegistry> {
  if (!force && cache) return Promise.resolve(cache);
  if (!force && inflight) return inflight;
  inflight = fetch(REGISTRY_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error(`模块注册表加载失败（HTTP ${response.status}）`);
      return response.json() as Promise<GameModuleRegistry>;
    })
    .then((registry) => {
      cache = { ...registry, modules: sortModules(registry.modules ?? []) };
      return cache;
    })
    .catch((error) => {
      inflight = null;
      throw error;
    });
  return inflight;
}

/** 已经拿到过的注册表快照（拿不到时返回 null）。 */
export function peekRegistry(): GameModuleRegistry | null {
  return cache;
}

/** 产物内文件的站点 URL，带版本号做缓存失效。 */
export function moduleAssetUrl(manifest: GameModuleManifest, file: string): string {
  const base = `/modules/${manifest.id}/${file.replace(/^\/+/, '')}`;
  return manifest.version ? `${base}?v=${manifest.version}` : base;
}

/**
 * 按 URL 路径找模块：取「前缀匹配且最长」的那个，
 * 这样 `/seiyuu-sukikirai/42` 会命中 `/seiyuu-sukikirai` 而不是别的。
 */
export function findModuleByPath(
  modules: readonly GameModuleManifest[],
  pathname: string
): GameModuleManifest | null {
  let matched: GameModuleManifest | null = null;
  let matchedLength = -1;
  for (const module of modules) {
    for (const prefix of [module.path, ...(module.aliases ?? [])]) {
      const normalized = prefix.replace(/\/$/, '');
      if (pathname !== normalized && !pathname.startsWith(`${normalized}/`)) continue;
      if (normalized.length > matchedLength) {
        matched = module;
        matchedLength = normalized.length;
      }
    }
  }
  return matched;
}
