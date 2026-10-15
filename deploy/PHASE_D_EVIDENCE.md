# Phase D 验收证据（填写后勾选计划文档）

> 勿写入真实密码、AppSecret、完整 Bearer、用户隐私或数据库连接串。  
> 日期格式：YYYY-MM-DD。执行人填姓名/账号即可。

## 元数据

| 项 | 值 |
| --- | --- |
| 执行日期 | 2026-10-15 |
| 执行人 | Cursor agent + 仓库维护者 |
| Git commit | 见最新 `ops/quality-gates/gate-summary-*.md` |
| 镜像/容器标签 | 未部署公网镜像（域名未定） |
| 正式 API 主机名 | **未确定**（仍为占位 `api.example.com`，见 `ops/DOMAIN_CUTOVER.md`） |
| 微信合法域名 | **未配置**（依赖正式主机名） |

## OPS 矩阵

| 编号 | 结果 (pass/fail/skip) | 证据摘要（命令或截图说明，脱敏） |
| --- | --- | --- |
| OPS-01 正式 HTTPS | **blocked** | 正式域名未提供；本地预检见 `ops/check-compose-bindings.ps1` PASS |
| OPS-02 HTTP 防护 | **blocked** | 依赖公网反代/TLS |
| OPS-03 端口暴露 | **partial** | Compose 静态检查 PASS（无 DB 宿主机端口、API loopback） |
| OPS-04 微信合法域名 | **blocked** | 依赖正式域名 |
| OPS-05 容器重启 | **blocked** | 待云主机演练 |
| OPS-06 备份恢复 | **blocked** | 脚本就绪；隔离恢复待云/本机 DB 演练填证 |
| OPS-07 迁移 | **partial** | Dockerfile 已固定 `migrate deploy` |
| OPS-08 日志检查 | **partial** | 代码层脱敏已落地；生产日志抽查待部署 |
| OPS-09 回滚演练 | **partial** | `ops/record-release-version.ps1` + runbook §D2.5 |
| OPS-10 资源异常 | **blocked** | 待云监控接入 |

## D2 备份恢复演练

| 项 | 值 |
| --- | --- |
| 备份开始时间 | |
| 备份文件名（不含秘密路径细节） | |
| 恢复目标库（隔离） | |
| 恢复结束时间 | |
| 数据核验方式 | 例如关键表行数对比 |
| 核验结果 | |

## D3 版本与告警

| 项 | 值 |
| --- | --- |
| `ops/releases/` 记录文件 | |
| Health 监控方式 | |
| 备份保留周期 | |
| 恢复责任人 | |

## 阻断项（若有）

| 问题 | 风险 | 负责人 | 预计解决日期 |
| --- | --- | --- | --- |
| | | | |
