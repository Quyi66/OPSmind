---
description: 维护系统 UI 样式统一性约束与开发规范
---

// turbo-all

为了保证 OPSmind 项目 UI 的高度统一和可维护性，在进行任何前端开发或重构任务时，必须严格遵守以下约束：

### 1. 样式统一性原则 (Style Consistency)

- **严禁私有覆盖**：禁止在 Vue 组件的 `<style scoped>` 中通过 `:deep()` 或直接定义的方式覆盖 Element Plus 的全局类（如 `.el-form-item__label`, `.el-input__inner`）或项目级全局布局类（如 `.ops-filter-bar`, `.ops-table-wrapper`, `.ops-pagination-wrapper`）。
- **全局布局优先**：页面主容器必须使用 `.ops-page-layout` 类，区块卡片必须使用 `.ops-section`。
- **使用工具类**：垂直间距、水平间距必须使用标准的 Margin/Padding 工具类（如 `mb-3`, `mt-4`, `ms-2`），严禁在私有 style 中设置外边距。

### 2. 组件选用规范 (Component Selection)

- **标准化链接**：所有的 ID 链接、详情跳转必须使用 `<el-link type="primary" :underline="false">`，严禁使用自定义样式的 `<a>` 标签。
- **标准化状态**：严重等级、系统来源等状态标识必须使用 `<el-tag size="small" round>`，禁止自研圆点或其他非标指示器。
- **表单标签**：所有的表单标签样式必须由全局统一控制，严禁在页面级修改字体大小或颜色。

### 3. Table 表格开发规范

- **固定表头与高度**：表格必须嵌套在 `.ops-table-wrapper` 中，并设置 `height="100%"`。严禁在组件内部硬编码 `calc(100vh - 480px)` 这种高度计算逻辑。
- **样式剔除**：表格列模板 `<template #default>` 中只应包含数据格式化逻辑（如日期格式化），禁止包含样式控制标签（如 `fw-bold`, `style="color:..."`）。
- **默认行为**：除非用户明确要求，否则表格不应手动开启 `border` 或 `stripe`，应保持与模块内其他页面一致的扁平化风格。

### 4. 提交前的自动化核查步骤法 (Self-Verification)

1.  **检查 Style 块**：确保 `<style scoped>` 中不存在任何以 `.el-` 或 `.ops-` 开头的选择器。
2.  **检查 ID 与链接**：确保所有的交互式 ID 都是 `el-link` 或标准 `el-button link`。
3.  **对齐参考页面**：在修改完成后，必须对照 `LinuxPatchScan.vue` 或 `PatchOverview.vue` 的实现，确保内边距和控件尺寸完全一致。
