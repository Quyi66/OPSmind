# 依赖安装指南

## 需要安装的开发依赖

为了完整支持项目的开发和构建功能，需要安装以下额外的开发依赖：

### 1. 测试框架依赖

```bash
npm install --save-dev vitest @vue/test-utils jsdom @vitest/ui happy-dom
```

### 2. 代码质量工具

```bash
npm install --save-dev @vue/eslint-config-prettier prettier
```

### 3. TypeScript 支持（可选）

如果需要 TypeScript 支持：

```bash
npm install --save-dev typescript vue-tsc @types/node
```

## 完整的 package.json devDependencies

将以下内容添加到 `package.json` 的 `devDependencies` 中：

```json
{
   "devDependencies": {
      "@tailwindcss/postcss": "^4.3.2",
      "@types/crypto-js": "^4.2.2",
      "@types/node": "^26.1.1",
      "@vitejs/plugin-vue": "^6.0.7",
      "@vitest/ui": "^4.1.10",
      "@vue/eslint-config-prettier": "^10.2.0",
      "@vue/test-utils": "^2.4.11",
      "autoprefixer": "^10.5.2",
      "eslint": "^9.39.1",
      "eslint-plugin-vue": "^9.19.2",
      "happy-dom": "^20.10.6",
      "husky": "^9.1.7",
      "jsdom": "^26.1.0",
      "lint-staged": "^17.0.8",
      "postcss": "^8.5.16",
      "prettier": "^3.9.4",
      "rimraf": "^6.1.3",
      "sass-embedded": "^1.100.0",
      "tailwindcss": "^4.3.2",
      "typescript": "^5.9.3",
      "vite": "^7.1.2",
      "vitest": "^4.1.10",
      "vue-tsc": "^3.3.7"
   }
}
```

## 安装命令

### 一次性安装所有依赖

```bash
npm install --save-dev @vue/eslint-config-prettier @vue/test-utils @vitest/ui happy-dom jsdom prettier typescript vue-tsc vitest
```

### 分步安装

1. **基础测试框架**：
   ```bash
   npm install --save-dev vitest @vue/test-utils jsdom
   ```

2. **测试 UI 和环境**：
   ```bash
   npm install --save-dev @vitest/ui happy-dom
   ```

3. **代码质量工具**：
   ```bash
   npm install --save-dev @vue/eslint-config-prettier prettier
   ```

4. **TypeScript 支持**（可选）：
   ```bash
   npm install --save-dev typescript vue-tsc @types/node
   ```

## 验证安装

安装完成后，可以运行以下命令验证：

```bash
# 检查测试框架
npm run test:run

# 检查代码质量
npm run lint:check

# 检查构建
npm run build:dev
```

## 注意事项

1. **Node.js 版本**：确保使用 Node.js 16+ 版本
2. **包管理器**：推荐使用 npm 7+ 或 yarn 1.22+ 或 pnpm 6+
3. **依赖冲突**：如果遇到依赖冲突，可以尝试删除 `node_modules` 和 `package-lock.json` 后重新安装
4. **网络问题**：如果安装缓慢，可以考虑使用国内镜像：
   ```bash
   npm config set registry https://registry.npmmirror.com/
   ```

## 开发工具推荐

### VS Code 扩展

项目已配置了推荐的 VS Code 扩展，安装后会自动提示安装：

- Vue Language Features (Volar)
- TypeScript Vue Plugin (Volar)
- ESLint
- Prettier - Code formatter
- GitLens

### 浏览器开发工具

- Vue.js devtools
- Chrome DevTools
- Firefox Developer Tools
