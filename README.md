# 部署方案
使用cloudeflare的免费服务

1. cloudeflare设置

菜单: 构建 -> 计算 -> Workers和Pages -> 创建应用(选择旧方式) -> 选择 upload you static file

2. 获取生成cloudflare token

菜单:管理账户 -> 账户api令牌 -> 创建令牌 -> 范围选择pages -> 得到token

https://dash.cloudflare.com/【这里一串uuid就是Account‑ID】/home

3. github设置
在 仓库 → Settings → Secrets and variables → Actions → 新建 2 个存储库密钥

CLOUDFLARE_API_TOKEN

CLOUDFLARE_ACCOUNT_ID


## ticker文档链接
https://tombcato.github.io/smart-ticker/?lang=en

## 自动化（GitHub Actions）

| 工作流 | 触发 | 做什么 |
| --- | --- | --- |
| `ci.yml` | PR / push main、develop | 类型检查 + prettier 格式检查 + 构建产物校验，再构建一次镜像并真的启动容器，验证首页、静态资源与 SPA 深链刷新。**只验证，不推送** |
| `build-images.yml` | push main、develop、tag `v*` | 用仓库根目录的 `Dockerfile`（node 构建 → nginx 托管）打镜像，推送到 Docker Hub / 阿里云 ACR |
| `deploy-cloudflare-pages.yml` | push main | 构建 H5 并发布到 Cloudflare Pages（Direct Upload） |

镜像与静态托管都从**当前提交的源码**构建；`docker/latest/Dockerfile.*` 那套多镜像链会去
GitHub 下载 main 分支的 zip，构建产物与提交无关，因此不再被工作流使用。

可选密钥（没配就自动跳过对应步骤，不会让流水线变红）：

| 名称 | 用途 |
| --- | --- |
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | 推送 Docker Hub（兼容旧名 `DOCKER_USERNAME` / `DOCKER_PASSWORD`） |
| `ALIYUN_REGISTRY` + `ALIYUN_NAMESPACE`(变量) + `ALIYUN_USERNAME` / `ALIYUN_PASSWORD` | 推送阿里云 ACR |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | 发布到 Cloudflare Pages |

本地等价命令：

```bash
npm ci && npm run type-check && npm run format:check && npm run build
docker build -t vue_tuiwen:dev . && docker run --rm -p 8080:80 vue_tuiwen:dev
```