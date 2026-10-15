# 部署、配置与运维要求

## 1. 环境配置

至少区分 development、test、production。配置项通过环境变量提供，仓库内只提交
`.env.example` / `.env.production.example`，不提交真实 `.env`。

建议配置类别：

- 运行环境与监听端口
- PostgreSQL 连接
- 会话 TTL（`AUTH_TOKEN_TTL_SECONDS`）
- 微信小程序 AppID / AppSecret
- 日志级别（`LOG_LEVEL`）
- 生产公共 API URL（给小程序与运维文档使用）

应用启动时应验证必需配置。缺少生产关键配置时应快速失败，而不是以不安全默认值继续运行。

生产强制规则（已在 `backend/src/config/env.validation.ts` 实现）：

- `ENABLE_DEV_AUTH=true` 与 `NODE_ENV=production` 同时出现时拒绝启动
- 生产必须提供 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`

参考文件：

- 开发：`backend/.env.example`
- 生产：`backend/.env.production.example`

## 2. 本地运行

见仓库根目录 `README.md`：

- 本机 PostgreSQL 或 `docker compose up -d`（开发用 `docker-compose.yml`）
- `npx prisma migrate deploy` + `npm run prisma:seed`（仅开发）
- `npm run start:dev`
- 健康检查：`GET /api/v1/health`
- 冒烟：`.\ops\smoke-api.ps1`

开发环境日志便于排错，但不得打印秘密。请求日志会脱敏 `code` / `token` 等查询参数，并输出 `X-Request-Id`。

## 3. 生产部署

推荐拓扑：

```text
Internet → HTTPS (nginx/Caddy) → 127.0.0.1:3000 (API) → private network → PostgreSQL
```

仓库已提供：

| 产物 | 说明 |
| --- | --- |
| `backend/Dockerfile` | 构建并启动 API，启动前 `prisma migrate deploy` |
| `docker-compose.prod.yml` | API + PostgreSQL；**数据库不映射宿主机端口**；API 仅绑定 `127.0.0.1:3000` |
| `deploy/nginx.conf.example` / `deploy/Caddyfile.example` | TLS 反代样例 |
| `deploy/PHASE_D_RUNBOOK.md` | Phase D 分步演练手册 |
| `deploy/PHASE_D_EVIDENCE.md` | OPS 验收证据模板 |
| `deploy/RELEASE_CHECKLIST.md` | 上线检查表 |
| `ops/verify-prod-surface.ps1` | 正式 HTTPS / HTTP 重定向验收 |
| `ops/check-compose-bindings.ps1` | 生产 Compose 端口绑定静态检查 |
| `ops/record-release-version.ps1` | 记录可回退版本元数据 |

### 3.1 Compose 启动（云主机示例）

```bash
cp backend/.env.production.example backend/.env.production
# 编辑密码、微信密钥、PUBLIC_API_BASE_URL

docker compose -f docker-compose.prod.yml --env-file backend/.env.production up -d --build
curl http://127.0.0.1:3000/api/v1/health
.\ops\smoke-api.ps1 -BaseUrl http://127.0.0.1:3000/api/v1
```

然后将 nginx/Caddy 配到公网 443，证书有效后把微信合法域名指到该 HTTPS 主机名。

### 3.2 部署步骤（摘要）

1. 创建应用运行环境  
2. 创建 PostgreSQL 实例与最小权限账号（不对公网开放）  
3. 配置环境变量与秘密  
4. 配置 HTTPS 域名和证书  
5. 配置微信小程序服务器合法域名  
6. 运行数据库迁移（镜像入口已含 `migrate deploy`）  
7. 启动应用并验证健康检查  
8. 执行 `ops/smoke-api.*`  
9. 验证日志、备份和恢复步骤  

平台选择（云主机 / 托管 Node）可在应用稳定后决定，不将具体云厂商写死在业务代码中。

## 4. 数据库迁移

- 所有结构变化必须提交迁移文件  
- 生产迁移前必须备份并确认迁移影响  
- 不在生产环境自动执行破坏性重置命令（禁止 `migrate reset`、禁止生产 seed）  
- 迁移失败时：回退应用版本；必要时按第 6 节从备份恢复  
- 生产数据不能被开发种子数据覆盖  

## 5. 日志与错误

已实现：

- 每个请求写入 `requestId`、方法、脱敏路径、状态码、耗时  
- 响应头返回 `X-Request-Id`；错误体可带 `error.requestId`  
- 不记录完整 Bearer、微信 `code` 查询参数  
- 未捕获异常对客户端只返回通用 `INTERNAL_ERROR` 消息  

运维注意：

- 不要把用户回忆全文打到普通应用日志  
- 生产 `LOG_LEVEL` 建议 `info` 或 `warn`  

## 6. 备份与恢复

### 6.1 策略建议

| 项 | 建议 |
| --- | --- |
| 频率 | 每日逻辑备份；重要发版前额外手动备份 |
| 保留 | 至少 7 日；发版备份保留到下一稳定周 |
| 权限 | 备份存储与生产 DB 凭证分离，禁止公开读 |
| 演练 | 每发版周期至少一次恢复到隔离库 |

### 6.2 命令（Windows / 本机 PostgreSQL）

```powershell
# 备份（可用应用库账号）
.\ops\backup-db.ps1

# 恢复演练（写入隔离库 life_exploration_restore_drill，不覆盖线上库）
# 需要具备 CREATE DATABASE 权限的账号，默认 postgresql://postgres@localhost:5432/postgres
# 可用环境变量 POSTGRES_ADMIN_URL 覆盖
.\ops\restore-db.ps1 -DumpFile .\ops\backups\life_exploration-YYYYMMDD-HHMMSS.dump -DropTargetAfter
```

Linux / macOS 对应 `ops/backup-db.sh`、`ops/restore-db.sh`。

### 6.3 真实恢复后的应用验证

1. 将 `DATABASE_URL` 指向已恢复库（或替换数据目录后启动）  
2. `npx prisma migrate deploy`  
3. `.\ops\smoke-api.ps1`  
4. 抽样验证登录、任务列表、图鉴  

对象存储（照片）若后续启用，需另备 bucket 版本/复制策略；第一版仅存引用时以 DB 备份为主。

## 7. 微信小程序上线前检查

- 账号主体、服务类目和平台规则已核对  
- API 使用 HTTPS  
- 服务器域名已加入小程序 request 合法域名  
- 正式登录只走服务端微信身份校验  
- 生产环境关闭测试认证（`ENABLE_DEV_AUTH=false`）  
- 小程序将 `miniprogram/config.ts` 的 `DEFAULT_API_BASE_URL` 改为正式
  `https://api.example.com/api/v1`（或运行时写入 storage `api_base_url`）  
- 隐私政策、用户协议、数据删除方式已准备  
- 关键流程在真实设备上测试  

完整勾选表见 `deploy/RELEASE_CHECKLIST.md`。

## 8. 监控与查询

- 监控建议见 `deploy/MONITORING.md`
- 热路径索引对照见 `ops/QUERY_INDEX_AUDIT.md`

## 9. 回滚

1. 回退到上一稳定应用镜像 / `dist` 构建  
2. 若迁移不可逆：从备份恢复数据库，并在隔离环境验证后再切流量  
3. 重新执行健康检查与冒烟脚本  
4. 确认微信合法域名仍指向可用 API  
