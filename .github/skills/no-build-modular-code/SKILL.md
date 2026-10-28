---
name: no-build-modular-code
description: Frontend code development skill that enforces modular component splitting and skips npm run build / build validation to save time. Use for all frontend code editing, refactoring, component writing tasks.
---

# No-Build Modular Code Skill
Keep frontend changes modular and validate them with focused checks without starting or building the application.

## 🚫 Execution Constraints (MANDATORY)
You are ONLY responsible for writing, modifying, and optimizing frontend code.
- **NEVER** execute `npm run build`, `npm run dev`, bundling, compiling, building, or project startup commands
- **DO NOT** perform build validation, project running, or generate build logs
- Prefer diff review, targeted ESLint checks, and relevant lightweight tests when appropriate. These are allowed; do not substitute a production build for them.
- Apply requested changes in the workspace and report validation results accurately.
- Skip all time-consuming build operations entirely

## 本机 Node / nvm 路径与沙箱排查

以下是此 Windows 开发环境的信息，不应套用到其他机器：

- nvm 安装目录：`C:\Users\yumiao\AppData\Local\nvm`，它是目录，不是 Node 可执行文件。
- 首选 Node 入口：`C:\nvm4w\nodejs\node.exe`。`C:\nvm4w\nodejs` 是符号链接；2026-09-20 核实其目标为 `C:\Users\yumiao\AppData\Local\nvm\v24.11.1`，Node 版本为 `v24.11.1`。切换 nvm 版本后目标会变化，不要把版本子目录硬编码为运行入口。
- 使用 PowerShell 调用带引号的路径时加 `&`。优先使用上述明确路径，不要仅凭 `node` 在 PATH 中无法识别就判定未安装。

```powershell
& 'C:\nvm4w\nodejs\node.exe' --version
Get-Item -LiteralPath 'C:\nvm4w\nodejs' -Force | Format-List FullName,LinkType,Target
# 从项目根目录执行，仅替换为本次改动相关的实际测试文件：
& 'C:\nvm4w\nodejs\node.exe' node_modules/vitest/vitest.mjs run tests/modules/patches/WinPatchBatchInstallDrawer.test.js
```

若明确路径仍提示“无法识别”或“找不到路径”，检查 `Get-Item` 的完整错误和符号链接目标。此环境曾在沙箱内同时返回 `Access is denied` 和“路径不存在”，但通过正常审批机制在沙箱外执行同一路径成功。这种情况应报告为访问受限，而非直接判定 Node 缺失。

有权限拒绝证据且任务需要验证时，通过工具支持的审批机制重试必要命令（例如 `exec_command` 的 `sandbox_permissions: "require_escalated"`，附具体原因）。遵守当次权限策略；不能将这份 skill 或之前成功的审批视为永久授权，也不要自行修改 ACL、关闭沙箱、重装 Node 或切换 nvm 版本。若审批被拒或工具不支持，准确说明阻塞原因和未完成的验证。

每个新任务的沙箱权限可能仍有相同限制。这份记录用于避免重复误判，不会改变系统权限；只有本 skill 被加载时，其排查指引才会生效。

运行前核对实际 Node 版本及项目 `package.json` 的 `engines`。本次 Node v24.11.1 已运行通过 3 个测试文件、30 个用例，但当时项目声明 Node >=24.20.0；测试通过不代表完全满足声明。不要静默改用 HBuilderX 附带的 `D:\HBuilderX\plugins\node\node.exe`：其 v18.20.0 曾因缺少 `node:util` 的 `styleText` 导出而无法启动本项目 Vitest。

## 🧩 Modular & Maintainability Constraints (CORE REQUIREMENT)
When writing pages and components, strictly follow modular splitting for long-term maintainability:
- **NEVER** put all logic (business, styles, requests, utils) in a single component/file
- Split code by single responsibility principle:
  - Business page components
  - Reusable UI components
  - Utility functions (utils)
  - API request modules (api)
  - Constant configurations (constants)
  - Type definitions (for TypeScript projects)
  - State management
  - Style files
- Ensure clear hierarchical structure, standardized naming, and concise comments at key positions
- Extract reusable logic to avoid code redundancy and hardcoding
- Ensure high maintainability, scalability, and reusability for future iterations and team collaboration
