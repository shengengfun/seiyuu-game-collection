// 按模板脚手架出一个新的小游戏模块。
//
// 用法：
//   node scripts/new-module.mjs <id> [--path=/xxx] [--title=中文名] [--ns=namespace] [--order=90]
//
// 例：
//   node scripts/new-module.mjs seiyuu-dice --title="声优骰子" --ns=seiyuuDice --order=95
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const TEMPLATE_DIR = path.join(ROOT, 'scripts/module-template');
const MODULES_DIR = path.join(ROOT, 'modules');

const [, , rawId, ...rest] = process.argv;
if (!rawId) {
  console.error('用法： node scripts/new-module.mjs <id> [--path=/xxx] [--title=中文名] [--order=90]');
  process.exit(1);
}

const flags = Object.fromEntries(
  rest
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, ...value] = arg.slice(2).split('=');
      return [key, value.join('=')];
    })
);

const id = rawId.trim();
if (!/^[a-z][a-z0-9-]*$/.test(id)) {
  throw new Error('模块 id 只能是小写字母、数字与短横线，且以字母开头');
}

const targetDir = path.join(MODULES_DIR, id);
if (fs.existsSync(targetDir)) {
  throw new Error(`目录已存在：${path.relative(ROOT, targetDir)}`);
}

const titleZh = flags.title ?? id;
const namespace = flags.ns ?? id.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const routePath = flags.path ?? `/${id}`;
const order = flags.order ?? '900';
const className = `mod-${id}`;
const pkgName = `@seiyuu/module-${id}`;

const replacements = {
  __MODULE_ID__: id,
  __MODULE_PATH__: routePath,
  __MODULE_TITLE_ZH__: titleZh,
  __MODULE_TITLE_EN__: titleZh,
  __MODULE_TITLE_JA__: titleZh,
  __MODULE_DESC_ZH__: `${titleZh}（待补充一句话介绍）`,
  __MODULE_DESC_EN__: `${titleZh} (add a one-line description)`,
  __MODULE_DESC_JA__: `${titleZh}（一言説明を追加してください）`,
  __MODULE_NS__: namespace,
  __MODULE_CLASS__: className,
};

function apply(content) {
  return Object.entries(replacements).reduce(
    (text, [token, value]) => text.split(token).join(value),
    content
  );
}

function copyTemplate(fromDir, toDir) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const entry of fs.readdirSync(fromDir, { withFileTypes: true })) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) copyTemplate(from, to);
    else fs.writeFileSync(to, apply(fs.readFileSync(from, 'utf8')), 'utf8');
  }
}

copyTemplate(TEMPLATE_DIR, targetDir);
console.log(`已创建模块 ${pkgName}`);
console.log(`  目录： modules/${id}`);
console.log(`  路由： ${routePath}`);
console.log(`  文案命名空间： ${namespace}`);
console.log('\n下一步：');
console.log('  1. 在 module.json 里补齐三语的 title / description，挑一个 lucide 图标名');
console.log(`  2. 在 apps/host/src/modules/moduleIcons.ts 里登记该图标`);
console.log(`  3. pnpm install && pnpm --filter ${pkgName} dev`);
