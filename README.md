# 每日打卡云端 MVP

Next.js + Vercel + Supabase 的每日打卡网页。`EveryDay_Old.xlsx` 保留为历史归档，新系统不读取、不改写旧 Excel。

## 本地开发

1. 在 Supabase 新建项目。
2. 在 Supabase SQL Editor 执行 `supabase/schema.sql`。
3. 复制 `.env.example` 为 `.env.local`，填入：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. 安装并启动：

```bash
npm install
npm run dev
```

## 部署

1. 上传代码到 GitHub。
2. 在 Vercel 导入该仓库。
3. 在 Vercel Environment Variables 中添加：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. 部署后通过 Vercel URL 访问。

如果你使用 Supabase 老项目里的 anon key，也可以把 key 放在
`NEXT_PUBLIC_SUPABASE_ANON_KEY`；代码会兼容这两个变量名。

## MVP 范围

- 邮箱注册、登录、找回密码。
- 今日打卡保存，按 `user_id + record_date` upsert。
- 历史记录查看和删除。
- 评分即时计算，保存 `score` 和 `score_detail`。
- 体重趋势、7 日均重、目标线、评分趋势、打卡天数。
- CSV 导出。

第一版不做旧 Excel 全量导入、自定义字段、评分配置编辑、Excel 写入、热量库或 AI 分析。
