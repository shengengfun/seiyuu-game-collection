// 把 modules/<id> 从主库拆成独立仓库，并改为主库的 git submodule。
//
// 步骤（对每个模块）：
//   1. 补上模块自己的 .gitignore（node_modules / dist / *.tsbuildinfo）
//   2. 在 modules/<id> 里 git init + 首次提交
//   3. gh repo create shengengfun/seiyuu-module-<id> --public --source ... --push
//   4. 主库：git rm -r --cached modules/<id>（文件留在磁盘上），
//      再 git submodule add --force <url> modules/<id> 复用已有本地仓库
//
// 用法：
//   node scripts/modules-to-submodules.mjs              # 全部模块
//   node scripts/modules-to-submodules.mjs song-quiz    # 只处理指定模块
//   node scripts/modules-to-submodules.mjs --dry-run    # 只打印计划，不执行
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const OWNER = 'shengengfun';
const GIT_USER = ['-c', 'user.name=shengengfun', '-c', 'user.email=shengengfun@users.noreply.github.com'];

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.filter((arg) => !arg.startsWith('--'));

const MODULE_GITIGNORE = `# 模块仓库只收录源码：产物与依赖不入库
node_modules/
dist/
*.tsbuildinfo
*.local
.DS_Store
`;

/** 执行命令并把输出回显出来（失败时抛出，附带完整输出）。 */
function run(cmd, cmdArgs, cwd = ROOT) {
  const display = `${cmd} ${cmdArgs.join(' ')}`;
  if (dryRun) {
    console.log(`  [dry-run] (${path.relative(ROOT, cwd) || '.'}) ${display}`);
    return '';
  }
  const env = { ...process.env };
  /* 防止外部 GIT_DIR 干扰：每个 git 调用都靠 -C 定位仓库 */
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  try {
    return execFileSync(cmd, cmdArgs, { cwd, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`.trim();
    throw new Error(`命令失败：${display}\n${out}`);
  }
}

function git(dir, ...gitArgs) {
  return run('git', [...GIT_USER, '-C', dir, ...gitArgs]);
}

/** 用临时文件传提交信息，避免中文经命令行参数被转码弄乱。 */
function commitFromMessage(dir, message) {
  const file = path.join(os.tmpdir(), `seiyuu-commit-${Date.now()}.txt`);
  fs.writeFileSync(file, message, 'utf8');
  try {
    git(dir, 'commit', '-q', '-F', file);
  } finally {
    fs.rmSync(file, { force: true });
  }
}

/** 本地仓库是否已经配好了某个 remote。 */
function hasRemote(dir, name) {
  return git(dir, 'remote')
    .split('\n')
    .some((line) => line.trim() === name);
}

/** 主库是否已经把该路径登记为 submodule（重跑时直接跳过）。 */
function isSubmodule(relPath) {
  const file = path.join(ROOT, '.gitmodules');
  if (!fs.existsSync(file)) return false;
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .some((line) => line.trim().replace(/\\/g, '/') === `path = ${relPath}`);
}

function listModules() {
  if (!fs.existsSync(MODULES_DIR)) return [];
  return fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((id) => fs.existsSync(path.join(MODULES_DIR, id, 'module.json')))
    .filter((id) => (only.length ? only.includes(id) : true))
    .sort();
}

function repoExists(fullName) {
  try {
    execFileSync('gh', ['repo', 'view', fullName, '--json', 'name'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
}

function moduleDescription(dir, id) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'module.json'), 'utf8'));
  const title = manifest.title?.zh ?? id;
  return `${title} —— 声优情报站小游戏模块（主库 seiyuu-game-collection 的子库）`;
}

const modules = listModules();
if (!modules.length) {
  console.log('[submodule] 没有需要处理的模块');
  process.exit(0);
}
console.log(`[submodule] 待处理 ${modules.length} 个模块：${modules.join(', ')}${dryRun ? '（dry-run）' : ''}`);

for (const id of modules) {
  const dir = path.join(MODULES_DIR, id);
  const repo = `${OWNER}/seiyuu-module-${id}`;
  const url = `https://github.com/${repo}.git`;
  const description = moduleDescription(dir, id);
  console.log(`\n[submodule] === ${id} → ${repo}`);

  if (isSubmodule(`modules/${id}`)) {
    console.log('  已是 submodule，跳过（只同步一次推送）');
    if (hasRemote(dir, 'origin')) git(dir, 'push', '-q', 'origin', 'main');
    continue;
  }

  // 1) 模块自己的 .gitignore
  const ignorePath = path.join(dir, '.gitignore');
  if (!fs.existsSync(ignorePath)) {
    if (dryRun) {
      console.log('  [dry-run] 写入 modules/.gitignore');
    } else {
      fs.writeFileSync(ignorePath, MODULE_GITIGNORE, 'utf8');
    }
  }

  // 2) 本地仓库 + 首次提交
  if (!fs.existsSync(path.join(dir, '.git'))) {
    git(dir, 'init', '-q', '-b', 'main');
    console.log('  git init');
  }
  git(dir, 'add', '-A');
  if (git(dir, 'status', '--porcelain').trim()) {
    commitFromMessage(
      dir,
      `feat: 初始化「${id}」模块仓库\n\n从 seiyuu-game-collection 拆分为独立子库，主站通过 git submodule 引用。\n${description}\n`
    );
    console.log('  git commit');
  } else {
    console.log('  工作区干净，跳过提交');
  }

  // 3) 创建远端并推送
  if (repoExists(repo)) {
    if (!hasRemote(dir, 'origin')) {
      git(dir, 'remote', 'add', 'origin', url);
      console.log('  补上 remote origin');
    }
    git(dir, 'push', '-u', 'origin', 'main');
    console.log('  推送完成（远端已存在）');
  } else {
    run('gh', [
      'repo', 'create', repo,
      '--public',
      '--source', dir,
      '--remote', 'origin',
      '--push',
      '--description', description,
    ]);
    console.log('  gh repo create + push');
  }

  // 4) 主库改成 submodule
  git(ROOT, 'rm', '-r', '--cached', '-q', `modules/${id}`);
  git(ROOT, 'submodule', 'add', '--force', url, `modules/${id}`);
  console.log('  主库已登记 submodule');
}

console.log('\n[submodule] 全部处理完毕');
