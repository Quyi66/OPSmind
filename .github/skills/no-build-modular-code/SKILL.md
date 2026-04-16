---
name: no-build-modular-code
description: Frontend code development skill that enforces modular component splitting and skips npm run build / build validation to save time. Use for all frontend code editing, refactoring, component writing tasks.
---

<!-- Tip: Use /create-skill in chat to generate content with agent assistance -->

# No-Build Modular Code Skill
Define the functionality provided by this skill, including detailed instructions and examples

## 🚫 Execution Constraints (MANDATORY)
You are ONLY responsible for writing, modifying, and optimizing frontend code.
- **NEVER** execute `npm run build`, `npm run dev`, bundling, compiling, building, or project startup commands
- **DO NOT** perform build validation, syntax checking, project running, or generate build logs
- Only output clean, final code content that can be directly pasted into VS Code
- Skip all time-consuming build operations entirely

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