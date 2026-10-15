# 人生探索图鉴：项目开发文档与工程基线

本仓库包含《人生探索图鉴》微信小程序的产品/后端规格，以及 Phase 0
起落地的工程代码。

## 1. 项目目标

构建可逐步上线的微信小程序：用户浏览现实生活探索任务，收藏或加入愿望清单，完成体验后可选择记录感受，逐步点亮个人图鉴。后续增加公开记录、点赞、收藏和举报等轻社交能力。

## 2. 技术基线

- 前端：原生微信小程序 + TypeScript（`miniprogram/`）
- 后端：Node.js + TypeScript + NestJS（`backend/`）
- 数据库：PostgreSQL + Prisma
- API：REST + JSON，统一前缀 `/api/v1`
- 本地数据库：Docker Compose

## 3. 仓库结构

| 路径 | 说明 |
| --- | --- |
| `01`–`09` `*.md` | 产品、架构、API、安全、阶段计划与 AI Coding 规则 |
| `backend/` | NestJS API |
| `miniprogram/` | 微信小程序工程骨架 |
| `docker-compose.yml` | 本地 PostgreSQL |

## 4. 推荐阅读顺序

1. `01-product-scope.md`
2. `02-architecture.md`
3. `03-data-model.md`
4. `04-api-spec.md`
5. `05-security-privacy.md`
6. `06-implementation-plan.md`
7. `07-acceptance-criteria.md`
8. `08-ai-coding-workflow.md`
9. `09-deployment-operations.md`

## 5. 本地启动（Phase 0）

### 5.1 前置条件

- Node.js 20+（推荐 LTS）
- PostgreSQL 16（本机安装；也可使用 Docker Compose）
- 微信开发者工具（打开小程序工程）

### 5.2 启动数据库

**推荐（本机 PostgreSQL）：**

1. 安装 PostgreSQL 16（可用 `winget install PostgreSQL.PostgreSQL.16`）
2. 创建用户/库（开发环境示例）：

```sql
CREATE ROLE life_exploration LOGIN PASSWORD 'life_exploration_dev';
CREATE DATABASE life_exploration OWNER life_exploration;
```

**可选（Docker）：**

```bash
docker compose up -d
```

默认连接串（仅开发环境）：

```text
postgresql://life_exploration:life_exploration_dev@localhost:5432/life_exploration?schema=public
```

### 5.3 启动后端

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

`.env` 至少需要：

- `DATABASE_URL`
- 开发环境建议 `ENABLE_DEV_AUTH=true`（生产必须为 false，且不能开启）
- 生产环境必须配置 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`

健康检查：

```bash
curl http://localhost:3000/api/v1/health
```

公开接口示例：

```bash
curl http://localhost:3000/api/v1/categories
curl "http://localhost:3000/api/v1/tasks?page=1&pageSize=20"
```

开发测试登录（仅非生产且 `ENABLE_DEV_AUTH=true`）：

```bash
curl -X POST http://localhost:3000/api/v1/auth/dev-login ^
  -H "Content-Type: application/json" ^
  -d "{\"wxOpenId\":\"seed-admin-openid\"}"
```

管理接口示例（使用登录返回的 `accessToken`，且用户角色为 ADMIN）：

```bash
curl -X POST http://localhost:3000/api/v1/admin/tasks ^
  -H "Authorization: Bearer <accessToken>" ^
  -H "Content-Type: application/json" ^
  -d "{\"categoryId\":\"<uuid>\",\"title\":\"...\",\"summary\":\"...\",\"instructions\":\"...\",\"difficulty\":\"EASY\"}"
```

缺少必要配置时，进程会在启动阶段失败，并输出明确错误说明；不会打印密钥明文。

### 5.4 打开小程序

用微信开发者工具打开**本仓库根目录**（已配置
`miniprogramRoot: miniprogram/`），或直接打开 `miniprogram/`
目录。

API 地址由 `miniprogram/config.ts` 按 `envVersion` 解析：

| 环境 | 默认 API | storage `api_base_url` 覆盖 | 微信登录失败后的 dev-login |
| --- | --- | --- | --- |
| `develop` / `trial` | `DEVELOPMENT_API_BASE_URL`（默认 `http://localhost:3000/api/v1`） | 允许 http/https | 允许（仍需后端 `ENABLE_DEV_AUTH=true`） |
| `release` | `PRODUCTION_API_BASE_URL`（必须 HTTPS 合法域名） | 仅允许安全 HTTPS；localhost/内网/HTTP 会被忽略 | **禁止**，展示明确错误 |

本地联调（`develop`）：

1. 先启动后端（`http://localhost:3000`），`.env` 中 `ENABLE_DEV_AUTH=true`
2. 开发者工具中可勾选「不校验合法域名…」——**仅开发者工具本地调试有效，正式版/体验版以微信后台合法域名为准，不能依赖此勾选**
3. 优先 `wx.login` → `/auth/wechat`；仅非正式版且微信登录失败时，才回退 `/auth/dev-login`
4. 闭环路径：探索列表 → 任务详情（收藏/愿望/开始/完成）→ 写回忆 → 图鉴 / 我的

发布前：把 `PRODUCTION_API_BASE_URL` 改为已在微信公众平台登记的 HTTPS 域名（勿使用 localhost 或 HTTP）。未改占位域名时，正式版请求会被拦截。

### 5.5 生产部署（Phase D）

逐步手册：`deploy/PHASE_D_RUNBOOK.md`；上线检查：`deploy/RELEASE_CHECKLIST.md`；证据模板：`deploy/PHASE_D_EVIDENCE.md`。

```bash
# 生产样例栈（DB 不对宿主机暴露；API 仅本机 3000）
cp backend/.env.production.example backend/.env.production
# 填入 POSTGRES_PASSWORD / WECHAT_* / PUBLIC_API_BASE_URL 后：
docker compose -f docker-compose.prod.yml --env-file backend/.env.production up -d --build

# 本地绑定安全检查 + 冒烟 + 备份恢复（Windows）
.\ops\check-compose-bindings.ps1
.\ops\smoke-api.ps1 -BaseUrl http://127.0.0.1:3000/api/v1
.\ops\backup-db.ps1
.\ops\restore-db.ps1 -DumpFile .\ops\backups\<file>.dump -DropTargetAfter

# 正式 HTTPS 验收（域名与证书就绪后）
.\ops\verify-prod-surface.ps1 -HttpsBaseUrl https://api.yourdomain.com/api/v1
.\ops\record-release-version.ps1 -Note 'prod deploy'
```

反代样例：`deploy/nginx.conf.example`、`deploy/Caddyfile.example`。  
生产后端必须 `NODE_ENV=production` 且 `ENABLE_DEV_AUTH=false`；小程序 `PRODUCTION_API_BASE_URL` 与微信合法域名一致。

### 5.6 稳定性与合规文档（Phase 7）

| 文档 | 说明 |
| --- | --- |
| `ops/QUERY_INDEX_AUDIT.md` | 热路径与索引对照 |
| `deploy/MONITORING.md` | 健康检查与日志监控建议 |
| `docs/legal/ACCOUNT_DELETION.md` | 账号注销清理范围 |
| `docs/legal/PRIVACY_POLICY_DRAFT.md` | 隐私政策提审草稿 |
| `docs/legal/USER_AGREEMENT_DRAFT.md` | 用户协议提审草稿 |

### 5.7 质量门禁

在 `backend/` 目录执行：

```bash
npm run check
```

等价于依次运行：格式检查、Lint、类型检查、单元测试、e2e、生产构建。

常用单独命令：

```bash
npm run format:check
npm run lint          # 仅检查，不改文件（门禁用）
npm run lint:fix     # 本地自动修复（勿用于 CI / check）
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

小程序类型检查与登录隔离单测：

```bash
cd miniprogram
npm install
npm run typecheck
npm test
```

完整门禁日志保存在 `ops/quality-gates/`（含 backend `npm run check` 输出）。

## 6. 全局开发规则

- 以可验收功能结果为准，不以“完成了某个文件”作为完成标准。
- 先完成个人探索闭环，再实现轻社交。
- 采用模块化单体，不拆微服务。
- 业务数据以 PostgreSQL 为准；前端本地缓存不能替代服务端持久化。
- 认证与授权必须在后端实施。
- 禁止将微信 AppSecret、数据库密码、JWT 密钥等秘密写入代码仓库或小程序前端。
- 不擅自增加 Redis、消息队列、微服务等非必要基础设施。
- API、数据模型或权限规则变化时，同步更新文档与测试。

## 7. 版本范围

第一版包括任务浏览、详情、收藏、愿望清单、完成任务、可选回忆、图鉴、个人资料、基础管理能力、微信登录、部署与隐私控制。轻社交作为后续阶段。

当前已完成：**Phase 0–7**（第一版工程闭环）。上线前请按 `deploy/RELEASE_CHECKLIST.md` 完成 HTTPS、微信合法域名与法务文案定稿。
