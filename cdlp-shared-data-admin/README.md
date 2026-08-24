# CDLP V7.1 — Shared Data 管理中心 V00

React + Vite + Supabase Shared Core 管理介面。

## GitHub Pages
此版本由 `Enric0316/space` repository 的 `cdlp-shared-data-admin/` 子目錄部署。
正式 Pages URL：`https://enric0316.github.io/space/`

Pages Source 已設定為 GitHub Actions（2026-08-24），此 commit 用於重新觸發正式部署驗證。

## 目前功能
- Supabase Email/Password 註冊、登入、登出
- 未登入：顯示 Shared Core 基線數字
- 已授權：LIVE Supabase + RLS
- Organization / Project / Location / People / Vendor
- Standard WorkItem 搜尋、篩選、多選
- `cdlp_select_standard_work_items()` 批次專案選用
- ProjectWorkItemID 檢視

## 安全
- Browser 只使用 Supabase publishable key
- 無 service-role / secret key
- 新註冊帳號預設沒有 Organization / Project 權限
- Admin Views 為 `security_invoker=true`
- RLS 保持啟用

## Build
Node.js 22：

```bash
npm install
npm run build
```
