# 异世界人生模拟器 (Life Simulator) 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 使用 Next.js 14 + TS + Tailwind + DeepSeek API 创建一个二次元 GalGame 风格的人生模拟小游戏。

**Architecture:** Next.js App Router 全栈架构。前端负责 UI 渲染和状态管理，后端 API Route 负责安全调用 DeepSeek API 并处理逻辑分析。

**Tech Stack:** Next.js, TypeScript, Tailwind CSS, Framer Motion, Lucide React, DeepSeek API.

---

### Task 1: 初始化项目环境

**Files:**
- Create: `.env.local`
- Create: `src/app/api/deepseek/route.ts`

- [ ] **Step 1: 创建 Next.js 项目**
Run: `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`

- [ ] **Step 2: 安装依赖**
Run: `npm install framer-motion lucide-react`

- [ ] **Step 3: 配置环境变量**
在 `.env.local` 中添加: `DEEPSEEK_API_KEY=your_api_key_here`

- [ ] **Step 4: 实现 API 代理基础结构**
在 `src/app/api/deepseek/route.ts` 中编写基础 POST 处理逻辑。

---

### Task 2: 实现视觉基础（星光背景与全局样式）

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/StarBackground.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: 配置 Google Fonts 与 Tailwind 基础颜色**
- [ ] **Step 2: 编写 Canvas 星光背景组件**
- [ ] **Step 3: 应用到根布局**

---

### Task 3: 角色创建页面实现

**Files:**
- Create: `src/components/CharacterCreation.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 实现名字与背景输入**
- [ ] **Step 2: 实现属性分配魔法阵 (智力/魅力/体力/运气)**
- [ ] **Step 3: 增加 5 点自由点数限制逻辑**

---

### Task 4: 篇章生成与游戏主舞台

**Files:**
- Create: `src/components/GameStage.tsx`
- Create: `src/lib/gameLogic.ts`

- [ ] **Step 1: 实现篇章初始化逻辑**
- [ ] **Step 2: 实现对话气泡组件 (GalGame 风格)**
- [ ] **Step 3: 实现选项按钮组 (支持 3-4 个选项 + 自由回答)**

---

### Task 5: 自由回答与智能分析逻辑

**Files:**
- Modify: `src/app/api/deepseek/route.ts`
- Modify: `src/components/GameStage.tsx`

- [ ] **Step 1: 后端增加对自由回答的 Prompt 分析逻辑**
- [ ] **Step 2: 前端增加输入框并处理提交**

---

### Task 6: 结局生成与整体润色

**Files:**
- Modify: `src/components/GameStage.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 实现结局展示弹窗**
- [ ] **Step 2: 添加全局转场动画**
- [ ] **Step 3: 最终验证与清理**
