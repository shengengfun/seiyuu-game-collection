import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * 读工作区里的源码文件（测试用）。
 *
 * 不用 `new URL(..., import.meta.url)` —— 在 vitest 的 jsdom 环境里
 * `import.meta.url` 不是 file: 协议，`new URL` 会直接抛错。
 * 这里从 cwd 往上找，所以 vitest 从包目录或仓库根启动都能命中。
 */
export function readSource(relativePath: string): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    const candidate = resolve(dir, relativePath);
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
    dir = resolve(dir, '..');
  }
  throw new Error(`找不到源码文件：${relativePath}`);
}

/** 从源码里抓出所有 `t('a.b.c')` 的键（动态拼接只会抓到前缀，带结尾的点）。 */
export function extractI18nKeys(source: string): string[] {
  // `\b` 保证不会把 `import('../config/xxx')` 里的 `t('` 当成翻译调用
  return [...source.matchAll(/\bt\('([^']+)'/g)].map((match) => match[1]);
}
