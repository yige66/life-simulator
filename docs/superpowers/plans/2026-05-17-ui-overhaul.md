# UI 视觉重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目 UI 从基础版重构为“华丽装饰派 (Ornate Style)”，包含幻想魔法阵、古典画框和现代极光元素。

**Architecture:** 更新 Tailwind 基础配置与全局 CSS，重构核心 UI 组件（属性面板、对话框、按钮），引入更复杂的 CSS 动画和 SVG 装饰。

**Tech Stack:** Next.js, Tailwind CSS, Framer Motion, Lucide React.

---

### Task 1: 更新视觉基础与样式库

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: 定义装饰性动画与渐变**
在 `globals.css` 中增加魔法阵旋转、极光呼吸感动画。
- [ ] **Step 2: 扩展 Tailwind 颜色与配置**
增加 `aurora-cyan` 等颜色，配置 `drop-shadow` 滤镜。

---

### Task 2: 实现“幻想魔法阵”属性面板

**Files:**
- Create: `src/components/MagicCircleStats.tsx`
- Modify: `src/components/GameStage.tsx`
- Modify: `src/components/CharacterCreation.tsx`

- [ ] **Step 1: 编写 MagicCircleStats 组件**
使用 SVG 和 CSS 动画实现旋转符文圆环，支持数值实时更新。
- [ ] **Step 2: 在游戏主舞台与角色创建页集成**
替换原有的简易进度条/星级显示。

---

### Task 3: 实现“古典画框”对话系统

**Files:**
- Modify: `src/components/GameStage.tsx`

- [ ] **Step 1: 重构对话气泡样式**
应用双线双弧形边框样式，增加纹理背景和渐变。
- [ ] **Step 2: 优化对话过渡动画**
增加文字逐行/淡入序列效果。

---

### Task 4: 实现“现代极光”按钮与选项

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/CharacterCreation.tsx`
- Modify: `src/components/GameStage.tsx`

- [ ] **Step 1: 在全局样式中定义极光按钮组件类**
- [ ] **Step 2: 应用到所有主要按钮与选项**
增加 L 型护角装饰和悬停时的光晕扩散效果。

---

### Task 5: 页面级动效与润色

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/StarBackground.tsx`

- [ ] **Step 1: 增强星光背景**
增加随鼠标移动的微弱粒子吸引效果。
- [ ] **Step 2: 实现“星门”转场动画**
在 `page.tsx` 的 AnimatePresence 中定义更华丽的 exit/enter 动效。
