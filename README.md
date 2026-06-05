# 📺 追番记录

一个个人追番记录网站，按季度记录和浏览追过的番剧。

## 技术栈

- Next.js 16 + TypeScript
- Tailwind CSS
- 数据存储：本地 JSON 文件（开发）/ Upstash Redis（生产）

## 本地开发

```bash
npm install
npm run dev
```

打开 http://localhost:3000 即可访问。

- 首页 `/` — 按季度浏览番剧
- 管理页 `/admin` — 添加、编辑、删除番剧

## 部署到 Vercel

1. 把项目推到 GitHub 仓库
2. 在 [Vercel](https://vercel.com) 用 GitHub 登录，导入该项目
3. 如果想在线编辑数据，需要在 Vercel Marketplace 添加 Upstash Redis 集成
4. Vercel 会自动设置 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 环境变量
5. 部署完成后，得到一个 `xxx.vercel.app` 公网地址

> 如果不配置 Upstash Redis，数据将存在本地 JSON 文件中，每次部署后重置为仓库中的数据。适合只读展示。
