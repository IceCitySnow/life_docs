# 正式域名与部署验证（当前状态）

## 阻断项（必须先由负责人确定）

仓库内生产 API 仍是占位域名：

- `miniprogram/config.ts` → `PRODUCTION_API_BASE_URL = https://api.example.com/api/v1`
- `backend/.env.production.example` → `PUBLIC_API_BASE_URL=https://api.example.com/api/v1`

**在未提供真实域名之前，无法完成：**

1. TLS 证书申请与 HTTPS 反代上线  
2. 微信公众平台 request 合法域名配置  
3. `verify-prod-surface.ps1` 对公网域名的验收  
4. 正式版小程序真机闭环  

请将确定后的值填入下表，并同步三处配置后继续：

| 配置点 | 值 |
| --- | --- |
| 正式 API 主机名（无路径） | `________________`（例：`api.yourdomain.com`） |
| HTTPS API Base | `https://<主机名>/api/v1` |
| 微信 request 合法域名 | 与主机名相同（无端口、无路径） |

同步文件：

1. `miniprogram/config.ts` → `PRODUCTION_API_BASE_URL`  
2. `backend/.env.production` → `PUBLIC_API_BASE_URL`（勿提交）  
3. `deploy/nginx.conf.example` 或 `deploy/Caddyfile.example` 中的 `server_name`  

## 域名就绪后的固定顺序

见 `deploy/PHASE_D_RUNBOOK.md`：

1. `docker compose -f docker-compose.prod.yml --env-file backend/.env.production up -d --build`  
2. 配置 nginx/Caddy + TLS  
3. `.\ops\verify-prod-surface.ps1 -HttpsBaseUrl https://<域名>/api/v1`  
4. 微信后台登记合法域名  
5. `.\ops\backup-db.ps1` + 隔离恢复演练，填写 `deploy/PHASE_D_EVIDENCE.md`  
6. 真机：登录失败仅错误+重试（无开发 token）→ 探索→完成→回忆→图鉴  

## 本地已完成的预检

- `.\ops\check-compose-bindings.ps1`：API 仅 loopback、DB 无宿主机端口、dev auth 关闭  
- 质量门禁结果目录：`ops/quality-gates/`  
