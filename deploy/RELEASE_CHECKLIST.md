# 发布前检查清单（Phase 5–7）

## A. 配置与秘密

- [ ] 使用独立 production 环境变量，仓库仅有 `.env*.example`
- [ ] `NODE_ENV=production`
- [ ] `ENABLE_DEV_AUTH=false`（启动校验已强制）
- [ ] 已配置 `WECHAT_APP_ID` / `WECHAT_APP_SECRET`
- [ ] `DATABASE_URL` 指向私网 PostgreSQL，账号最小权限
- [ ] 数据库密码、AppSecret 未写入小程序或日志

## B. 网络与 HTTPS

- [ ] API 仅通过 HTTPS 对外（nginx/Caddy/云负载均衡终止 TLS）
- [ ] PostgreSQL **不**对公网开放端口
- [ ] 应用进程仅监听内网或 `127.0.0.1`，由反向代理暴露
- [ ] 微信公众平台已配置 request 合法域名（HTTPS，无端口）
- [ ] 小程序 `apiBaseUrl` 指向正式 HTTPS 地址

## C. 数据与迁移

- [ ] 发布前已执行备份（`ops/backup-db.ps1` 或 `ops/backup-db.sh`）
- [ ] 已在隔离库完成至少一次恢复演练（`ops/restore-db.*`）
- [ ] 生产执行 `prisma migrate deploy`（禁止 `migrate reset` / 生产 seed）
- [ ] 迁移失败回滚策略已确认（恢复备份 + 回退应用镜像）

## D. 启动验证

- [ ] `GET /api/v1/health` 返回 `status=ok` 且 `database=up`
- [ ] 执行 `ops/smoke-api.ps1 -BaseUrl https://api.example.com/api/v1`
- [ ] 微信登录（真实 code）在真机可用
- [ ] 探索 → 完成 → 回忆 → 图鉴闭环在真机走通
- [ ] 重启 API / 数据库容器后数据仍在

## E. 日志与隐私

- [ ] 日志含 requestId / 方法 / 路径 / 状态码 / 耗时（见 `deploy/MONITORING.md`）
- [ ] 日志不含完整 Bearer、微信 code、AppSecret、数据库密码
- [ ] 错误响应无堆栈、无 SQL、无连接串
- [ ] 用户协议 / 隐私政策已定稿（草稿：`docs/legal/`）
- [ ] 账号注销路径已在真机验证（`DELETE /users/me` / 小程序「注销账号」）
- [ ] `npm run check`（backend）与 `npm run typecheck`（miniprogram）通过
- [ ] P0 闭环：探索 → 完成 → 回忆 → 图鉴 → 公开 → 点赞 真机走通

## F. 回滚

1. 将应用回退到上一稳定镜像/构建产物  
2. 如迁移不可逆：从备份恢复数据库到演练验证通过的时间点  
3. 再次执行健康检查与冒烟脚本  
4. 微信端确认合法域名仍指向可用 API  
