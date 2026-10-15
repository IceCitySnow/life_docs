# Phase D 生产部署与运维演练手册

本手册把 `life_exploration_release_dev_test_plan.md` Phase D 拆成可执行步骤。  
**云主机、域名、证书、微信后台配置必须由负责人在真实环境完成**；仓库侧提供 Compose、反代样例、脚本与证据模板。

推荐拓扑：

```text
Internet → HTTPS:443 (nginx/Caddy) → 127.0.0.1:3000 (API) → Compose 内网 → PostgreSQL（无宿主机端口）
```

当前代码基线（发布记录用）：见 `ops/releases/` 下最近一次 `record-release-version` 输出，或 `git rev-parse HEAD`。

---

## 0. 前置条件（负责人准备）

| 项 | 说明 |
| --- | --- |
| 云主机 | Linux，已安装 Docker + Compose plugin |
| 域名 | 例如 `api.yourdomain.com`，A/AAAA 指向主机公网 IP |
| TLS | Let’s Encrypt 或云证书；证书链完整 |
| 微信 | 小程序后台「request 合法域名」= 上述 HTTPS 主机名（无端口、无路径） |
| 秘密 | 已准备强密码、`WECHAT_APP_ID` / `WECHAT_APP_SECRET`（仅服务端） |

复制环境文件（**勿提交**）：

```bash
cp backend/.env.production.example backend/.env.production
# 编辑 POSTGRES_PASSWORD / WECHAT_* / PUBLIC_API_BASE_URL
```

小程序同步：把 `miniprogram/config.ts` 的 `PRODUCTION_API_BASE_URL` 改为与 `PUBLIC_API_BASE_URL` 相同的 HTTPS 地址。

---

## D1. HTTPS 与公网入口

### D1.1 启动生产栈（本机仅 loopback）

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env.production up -d --build
curl -sS http://127.0.0.1:3000/api/v1/health
```

验收：

- `postgres` **无**宿主机端口映射（`docker compose … ps` / `ss -lntp` 看不到 5432 对公网）
- `api` 仅 `127.0.0.1:3000`
- `ENABLE_DEV_AUTH` 在生产必须为 `false`（Compose 已写死）

### D1.2 配置反代 + TLS

任选其一：

- Nginx：`deploy/nginx.conf.example`（替换 `api.example.com` 与证书路径）
- Caddy：`deploy/Caddyfile.example`（自动申请证书更省事）

HTTP → HTTPS 重定向后，在**本机或办公网**验证：

```powershell
.\ops\verify-prod-surface.ps1 -HttpsBaseUrl https://api.yourdomain.com/api/v1
```

验收：

- OPS-01：HTTPS 健康检查通过  
- OPS-02：HTTP 入口 301/308 到 HTTPS（或直接拒绝明文 API）  
- OPS-03：公网扫端口时 PostgreSQL 不可达；API 不直暴 3000  
- OPS-04：微信合法域名与证书主机名一致；真机无正式版/体验版请求无域名错误  

### D1.3 微信合法域名

1. 微信公众平台 → 开发 → 开发管理 → 服务器域名  
2. request 合法域名填入 `https` 主机名（例如 `api.yourdomain.com`）  
3. 与 `PRODUCTION_API_BASE_URL` / `PUBLIC_API_BASE_URL` 完全一致  

---

## D2. 迁移、备份与恢复

### D2.1 迁移规则

- 镜像入口已执行：`npx prisma migrate deploy && node dist/main.js`
- **禁止**生产：`prisma migrate reset`、`prisma db seed`
- 迁移前先备份（下一节）

### D2.2 备份

在能访问数据库的运维跳板（或通过 `docker exec` 进 postgres 容器）执行：

```powershell
# 若从宿主机经 SSH 隧道连到私网 DB：
.\ops\backup-db.ps1 -DatabaseUrl 'postgresql://USER:PASS@127.0.0.1:5432/life_exploration'
```

Compose 内备份示例：

```bash
mkdir -p ops/backups
docker compose -f docker-compose.prod.yml --env-file backend/.env.production exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "ops/backups/life_exploration-$(date +%Y%m%d-%H%M%S).dump"
```

备份文件落在 `ops/backups/`（已 gitignore），权限仅运维可读。

### D2.3 隔离库恢复演练（必做一次）

```powershell
.\ops\restore-db.ps1 -DumpFile .\ops\backups\<file>.dump -DropTargetAfter
```

在证据模板记录：开始时间、结束时间、核验方式（例如恢复后 `SELECT count(*) FROM "User"`）。

### D2.4 容器重启数据仍在

```bash
docker compose -f docker-compose.prod.yml --env-file backend/.env.production restart
curl -sS http://127.0.0.1:3000/api/v1/health
# 对比重启前后关键业务计数 / 备份校验值
```

### D2.5 失败时操作顺序（固定）

1. **停止**继续写入（可临时摘掉反代 upstream）  
2. **回退应用镜像/容器**到上一记录版本（见 `ops/releases/`）  
3. 若迁移不可逆或数据损坏：**从备份恢复**到隔离验证过的 dump  
4. 再执行 `verify-prod-surface` + `smoke-api`  
5. 恢复微信流量  

---

## D3. 日志与可运维性

### D3.1 日志字段

正常请求日志应含：`requestId`、method、sanitized path、status、duration。  
抽查时确认**没有**：完整 Bearer、微信 code、AppSecret、数据库密码、私密回忆正文。

```bash
docker logs --tail 200 life-exploration-api-prod
```

### D3.2 健康与重启

- Compose：`restart: unless-stopped` + API/DB healthcheck  
- 外部：UptimeRobot / 云监控轮询 `https://…/api/v1/health`  
- 磁盘：告警备份目录与 Docker volume 所在盘  

### D3.3 记录可回退版本

每次上线后：

```powershell
.\ops\record-release-version.ps1 -Note 'prod deploy YYYY-MM-DD'
```

产出 `ops/releases/release-<stamp>.json`（可提交仓库的非秘密元数据）。

### D3.4 冒烟

```powershell
.\ops\smoke-api.ps1 -BaseUrl https://api.yourdomain.com/api/v1
```

---

## 证据与勾选

完成每项后，把结果填入 `deploy/PHASE_D_EVIDENCE.md`，再回写  
`life_exploration_release_dev_test_plan.md` Phase D / OPS-01～OPS-10 复选框。

未完成真实域名与证书前，**不得**将计划中 D1 云验收项标为通过。
