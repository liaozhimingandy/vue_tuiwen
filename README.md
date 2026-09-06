# 部署方案
使用cloudeflare的免费服务

1. cloudeflare设置

菜单: 构建 -> 计算 -> Workers和Pages -> 创建应用 -> 选择 upload you static file

2. 获取生成cloudflare token

菜单:管理账户 -> 账户api令牌 -> 创建令牌 -> 范围选择pages -> 得到token

https://dash.cloudflare.com/【这里一串uuid就是Account‑ID】/home

3. github设置
在 仓库 → Settings → Secrets and variables → Actions → 新建 2 个存储库密钥

CLOUDFLARE_API_TOKEN

CLOUDFLARE_ACCOUNT_ID


## ticker文档链接
https://tombcato.github.io/smart-ticker/?lang=en