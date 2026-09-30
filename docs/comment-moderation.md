# 评论自动审核与账号邮箱验证

本文记录「喜欢或讨厌」短评上线的技术方案：**本地轻量审核引擎**（零外部依赖、零成本）
与**邮箱验证码账号流程**（注册 / 找回密码）。运维需要的开关、阈值、词库维护方式都在这里。

---

## 一、方案调研：为什么不上第三方审核 API

| 方案 | 形态 | 成本 | 适配性 | 结论 |
| --- | --- | --- | --- | --- |
| Akismet（WordPress 生态标杆） | HTTP API | 商用收费；免费档仅个人非商业 | 面向博客评论，中文短评与饭圈黑话识别一般 | ✗ |
| 百度内容审核 / 腾讯云天御 / 阿里云绿网 | HTTP API | 按次计费，需实名与资质申请 | 识别力最好，但对个人站是小马拉大车 | ✗（可后续接入，见「扩展」） |
| OpenAI / 各类 LLM Moderation | HTTP API | 按 token 计费，需联网 | 需把用户内容发到境外第三方 | ✗ |
| 通用开源词库（sensitive-word 等） | 库 / 词表 | 免费 | Java 生态居多；纯词表可直接搬 | △ 词表思路可用，实现自己写更轻 |
| **自建本地引擎（本次采用）** | 进程内纯函数 | **0** | 完全可控，可针对站点黑话调词库 | ✓ |

**关键判断**：本板块的短评只有 200 字、量级小（小时级几十条），风险集中在
**辱骂 / 色情 / 开盒 / 站外导流**四类，属于「词典 + 启发式」最擅长的场景。
自建引擎没有网络往返、没有单条成本、不把用户内容交给第三方，最契合站点现状。

### 架构

```
POST /api/sukikirai/comments
        │
        ├─ 频率闸门：Redis/内存限流（小时 5 条）+ 60 秒突发限流
        │            + 库内冷却（COMMENT_COOLDOWN_SECONDS）+ 每日上限（COMMENT_DAILY_LIMIT）
        │
        ├─ services/commentModeration.ts
        │      信誉分：邮箱已验证 / 注册满 7 天 / 历史被采纳 ≥3 条 → 减分
        │              历史被驳回 / 24 小时内重复同一段内容 → 加分
        │      内容指纹：normalize + 折叠重复字符 → sha256（去重用）
        │
        └─ services/moderation/engine.ts（纯函数，无 I/O）
               ① 归一化：NFKC 折叠 → 去零宽字符 → 只留字母/数字/汉字
               ② Aho-Corasick 单次扫描（模块加载时构图，匹配 O(n)）
               ③ 启发式：链接 / 短链 / 手机号 / 身份证号 / 重复灌水 / 符号刷屏
               ④ 计分 → approve / review / reject
```

**性能**：词库约 300 条，自动机在进程启动时构建一次（毫秒级）；单条 200 字短评的
匹配是单次线性扫描，实测微秒级，不占事件循环。纯函数实现也可以直接单测。

### 三档处置

| 引擎判定 | 分数区间 | 落库状态 | 用户看到 |
| --- | --- | --- | --- |
| `approve` | < 40 | `approved`，`decided_by=auto` | 「已发布」，立即出现在评论区 |
| `review` | 40 ~ 79 | `pending` | 「已提交，等待管理员审核」 |
| `reject` | ≥ 80 或命中高危词 | `rejected`，`decided_by=auto` | 「内容被自动拦下，换个说法再试试」，可改写重投 |

命中 `abuse / adult / politics / illegal` 高危词直接进 `reject`（不看分数）；
`reject` 的判定可以关（`COMMENT_AUTO_REJECT=false` 时一律转人工）。

### 词库维护

词库在 `server/src/services/moderation/words.ts`，按 **类别 + 严重度** 分组：

- `ABUSE_HARD / ADULT / POLITICS / ILLEGAL / SPAM_HARD` → 严重度 3，命中即拒
- `ABUSE_MILD / SPAM_SOFT` → 严重度 2，转人工
- `LEAK` → 严重度 1，只计分

两条约定：

1. **归一化会去掉标点与空白**，所以「加 微 信」「傻\*逼」这类规避写法都能命中。
   写词条时不要带空格或标点。
2. 容易误伤的短词（如「你妈」「干你」）要在 `BENIGN_PREFIX` / `BENIGN_SUFFIX`
   里加良性搭配守卫，否则会拦掉「你妈妈也喜欢」这种正常评论。

改完词库跑一次单测即可：`pnpm --prefix server exec vitest run src/services/moderation/engine.test.ts`。

### 后台

管理后台「短评审核」标签页：

- 状态过滤（待审核 / 已通过 / 已驳回 / 全部）+ **判定来源**过滤（自动 / 人工）
- **只看高风险**：筛出引擎打分 ≥ 40 的记录，便于人工抽查自动放行的边界内容
- 每条卡片显示「自动判定 N 分」徽标、命中的类别与词（鼠标悬停徽标可看完整机器码）
- 顶部显示自动审核累计：直接公开 N 条 / 自动拒绝 N 条

管理员一旦手动改状态，该条记录的 `decided_by` 变成 `admin`（引擎分数保留供追溯）。

### 扩展（想要第三方审核时）

引擎的调用点只有一处（`services/commentModeration.ts` 的 `moderateComment`）。
接第三方 API 的做法是：保留本地引擎作为**前置**（它免费且能挡住 90% 的明显垃圾），
只在 `action === 'review'` 时再调用外部接口做二次判定，避免为每条评论付网络往返成本。

---

## 二、账号：邮箱验证码

### 为什么用验证码而不是链接

链接式验证（`services/emailVerification.ts`）适合**已登录用户绑定/换绑邮箱**；
而注册与找回密码这两处用户没有会话，验证码留在同一个表单里更顺，也方便做倒计时与错误提示。

### 流程

| 端点 | 用途 | 保护 |
| --- | --- | --- |
| `POST /api/auth/register/code` | 注册第一步，给邮箱发 6 位码 | 注册档 PoW + IP 限流（10 次/小时）+ 同邮箱冷却 60 秒 |
| `POST /api/auth/register` | 注册（用户名 + 密码 + 邮箱 + 验证码） | 注册档 PoW + 限流 3 次/小时 |
| `POST /api/auth/password/code` | 找回密码第一步，给注册邮箱发码 | 注册档 PoW + IP 限流；**邮箱未注册也返回 ok**（防账号枚举） |
| `POST /api/auth/password/reset` | 验证码换新密码 | 限流 10 次/小时；成功后 `token_version + 1`，踢掉所有旧会话 |

要点：

- **只存哈希**：库里是 `sha256(purpose:email:code)`，明文验证码只存在于邮件里。
- **一次性**：验证成功即消费；同一个码无法二次使用。
- **防爆破**：单个验证码最多错 `EMAIL_CODE_MAX_ATTEMPTS`（默认 5）次，用满作废。
- **防轰炸**：同邮箱 60 秒冷却、每小时 5 封、每天 10 封；同一 IP 每小时 10 封（IP 只存 HMAC）。
- **注册即已验证**：验证码证明了邮箱所有权，账号直接落 `email_verified_at`，
  不再走「注册后还要点链接」的老流程（老流程仍服务于登录后换绑邮箱）。
- **过期清理**：发码时顺手删掉 24 小时前的旧记录（每小时最多一次）。

### SMTP 配置

注册强依赖发信，**没配 SMTP 就无法注册**。临时跑通与正式对外两套建议：

```dotenv
# ① 临时试跑：QQ 邮箱授权码（免费、无需域名，但易进垃圾箱、有日发信上限）
EMAIL_SMTP_HOST=smtp.qq.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_USERNAME=你的QQ邮箱
EMAIL_SMTP_PASSWORD=QQ邮箱设置里生成的授权码   # 不是登录密码
EMAIL_FROM=你的QQ邮箱

# ② 正式对外：腾讯云 SES / 阿里云邮件推送（需给域名配 SPF / DKIM / DMARC，送达率高）
EMAIL_SMTP_HOST=smtp.qcloudmail.com
EMAIL_SMTP_PORT=465
EMAIL_SMTP_SECURE=true
EMAIL_SMTP_USERNAME=发信地址
EMAIL_SMTP_PASSWORD=SMTP 密码
EMAIL_FROM=no-reply@你的域名
```

本地开发不想配 SMTP 时，把 `EMAIL_LOG_CODES=true`（**仅非生产环境生效**），
验证码会打到服务端日志，前端照常走完流程。

---

## 三、环境变量速查

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `SUKIKIRAI_COMMENTS_ENABLED` | `false` | 短评公开侧总开关，置 `true` 才开放投递与展示 |
| `COMMENT_AUTO_MODERATION` | `true` | `false` = 全部转人工（引擎判定仍记录，后台可参考） |
| `COMMENT_AUTO_REJECT` | `true` | `false` = 高风险也只转人工，不自动拒绝 |
| `COMMENT_COOLDOWN_SECONDS` | `30` | 同一账号两次发表的最短间隔 |
| `COMMENT_DAILY_LIMIT` | `10` | 同一账号每日发表上限（含被拒的重投） |
| `EMAIL_CODE_TTL_SECONDS` | `600` | 验证码有效期 |
| `EMAIL_CODE_COOLDOWN_SECONDS` | `60` | 同邮箱索码冷却 |
| `EMAIL_CODE_MAX_ATTEMPTS` | `5` | 单个验证码最大错误次数 |
| `EMAIL_LOG_CODES` | 非生产为 `true` | 未配 SMTP 时把验证码写日志 |

---

## 四、上线检查清单

1. `.env` 填好 `EMAIL_SMTP_*`（否则注册直接不可用），`EMAIL_LOG_CODES=false`
2. `SUKIKIRAI_COMMENTS_ENABLED=true`
3. `server/src` 改过 → **必须 `pnpm build` + 重启**（`dist` 不会热重载）
4. `client/src` 改过 → `pnpm --filter client build` 后**重启 server**（index.html 的 CSP 哈希在启动时算）
5. 前端改动同步一份到 `_package/client`（整合包自带源码，不镜像就丢改动）
6. 冒烟：注册 → 收码 → 登录 → 投票 → 发一条干净短评（直接公开）→ 发一条带联系方式的（自动拒绝）
