# @seiyuu/shared

声优情报站的跨端共用库：**客观身份数据**放这里，玩法专属数据不放这里。

## 里面有什么

| 模块 | 内容 |
| --- | --- |
| `src/seiyuu/roster.ts` | `SEIYUU_ROSTER`：声优身份档案（`id` / `name` / `nameJa` / `romaji` / `project` / `characters`） |
| `src/seiyuu/projects.ts` | `PROJECT_IDS`、`PROJECTS`：企划 id 与中日英写法 |
| `src/seiyuu/types.ts` | `SeiyuuIdentity`、`RepresentativeCharacter` 等类型 |
| `src/seiyuu/index.ts` | `SEIYUU_BY_ID`、`seiyuuById`、`seiyuuByProject`、`seiyuuPhotoPath` |

**不放这里**：测验画像分、题库、i18n 文案——这些属于具体玩法，按 `id` 关联即可。

## 怎么用

```ts
import { SEIYUU_ROSTER, seiyuuById, formatCharacter } from '@seiyuu/shared';
```

## 维护约定

- `id` 同时决定公式照文件名 `client/public/seiyuu/<id>.jpg`，**改名要同步重命名图片**，
  并且改 `client/src/i18n/resources.ts` 里 `whoYouAre.vibes.<id>` 的文案键（三语言各一处）。
- `name` 是站内展示用的简体中文名；`nameJa` 是官方日文表记（如官方写作 `楡井希実`
  而中文通行写法是 `榆井希实`，就分别放进这两个字段）。
- `project` 记主要企划；跨界声优（同时属于两个企划）用 `alsoIn` 补充，
  校验脚本据此避免误报企划不符。
- 改完数据跑一次校验：

  ```bash
  node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/verify-seiyuu.mjs
  ```

  它会对照服务端 SQLite 声优库与 Bangumi API，把「库里查不到」「企划对不上」
  「日文表记对不上」「缺公式照」等问题写成报告，输出到 `tmp/seiyuu-verify-report.md`。
  加 `--no-bangumi` 可跳过联网核对，只比对本地库。
