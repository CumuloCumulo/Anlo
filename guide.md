# 🎯 Anlo 核心技术原理文档

本文档阐述 Anlo 插件的核心技术原理，重点解释如何在动态网页中实现稳定的元素定位。

---

## 📌 核心问题：为什么传统选择器会失效？

### 问题场景

许多现代网页使用前端框架（React、Vue、Angular、jqx 等）动态生成 DOM 元素，导致：

**1. 动态 ID 生成**
```html
<!-- 刷新前 -->
<input id="jqxWidgetd6e0a20d" name="ZRS" />

<!-- 刷新后（ID 变了！） -->
<input id="jqxWidget8f3a192c" name="ZRS" />
```

**2. 动态 Class 生成**
```html
<!-- 框架生成的随机 class -->
<div class="css-1n7v3ny-control css-15m2sg2">
  <input />
</div>
```

**3. DOM 结构重新渲染**
- 异步数据加载后整个表单重新生成
- 框架 diff 算法导致节点替换
- 条件渲染导致元素顺序变化

### 传统方案的局限性

❌ **直接 ID 选择器**：`#jqxWidgetd6e0a20d` → 刷新后失效  
❌ **动态 Class**：`.css-1n7v3ny-control` → 不稳定  
❌ **绝对路径**：`body > div:nth-child(2) > form:nth-child(3)` → 结构变化就失效

---

## 🔑 核心技术 1：容器选择器策略

### 原理

**即使输入框本身的属性会变化，但它的父容器结构往往是稳定的。**

### 实际案例

```html
<!-- 这个结构在页面刷新后通常不变 -->
<div class="bh-form-group bh-required">
  <label class="bh-form-label" title="总人数">总人数</label>
  <div class="bh-ph-8 bh-form-readonly-input" emap-role="input-wrap">
    <!-- ❌ 输入框的 id/class 可能变化 -->
    <input class="bh-form-control jqx-input jqxWidget123abc" 
           id="jqxWidgetXXXX" 
           name="ZRS" 
           type="text">
  </div>
</div>
```

### 定位思路

1. **找到稳定的容器**（如 `.bh-form-group`）
2. **在容器内查找输入框**（而不是直接定位输入框）
3. **结合 label 语义验证**（确保找到的是正确的输入框）

### 容器查找优先级

Anlo 按以下顺序查找容器：

```
1. [data-name] 属性容器     ← 最稳定
2. [data-field] 属性容器
3. [data-caption] 属性容器
4. .bh-form-group 类容器    ← 业务系统常用
5. 包含 "form" 的类容器
6. 包含 "field" 的类容器
7. 直接父元素               ← 最后手段
```

---

## 🔑 核心技术 2：稳定选择器生成算法

### 生成策略

从目标元素向上遍历 DOM 树，构建一条**尽可能稳定**的选择器链。

### 选择器优先级（从高到低）

#### 1️⃣ **稳定 ID**（最优）

```typescript
// ✅ 稳定的 ID
#userForm
#mainContainer

// ❌ 动态 ID（排除）
#jqxWidgetd6e0a20d    // 包含 jqx
#random12345          // 包含 random
#widget1234567890     // 包含长数字
```

**排除规则**：正则匹配 `/jqx|random|dynamic|\d{6,}/i`

#### 2️⃣ **稳定 Class**

```typescript
// ✅ 稳定的 class
.bh-form-group
.user-input-wrapper

// ❌ 动态 class（排除）
.css-1n7v3ny-control  // CSS-in-JS 生成
.jqx-widget-content   // jqx 框架
.random-abc123        // 包含 random
```

**过滤策略**：
- 排除包含 `jqx`、`random`、`dynamic` 的 class
- 排除包含长数字串（5位以上）的 class
- 最多取前 2 个稳定 class

#### 3️⃣ **语义属性**（关键！）

```html
<!-- 这些属性通常是开发者定义的，非常稳定 -->
<div data-name="userInfo">
<div data-field="totalCount">
<div data-caption="总人数">
<div emap-role="input-wrap">
<div data-role="form-control">
```

**优先属性列表**：
```typescript
['data-name', 'data-field', 'data-caption', 'emap-role', 'data-role']
```

#### 4️⃣ **nth-child 定位**（兜底）

```typescript
// 只在有相同兄弟元素时添加
div.form-item:nth-child(3)
```

**判断逻辑**：
- 检查父元素下是否有多个相同选择器的元素
- 如果有，则添加 `:nth-child(n)` 进行区分

### 生成示例

**假设 DOM 结构：**
```html
<div class="page-container">
  <div class="bh-form-group" data-field="ZRS">
    <label class="bh-form-label">总人数</label>
    <div emap-role="input-wrap">
      <input class="jqx-widget123" id="jqxWidgetXXXX" name="ZRS">
    </div>
  </div>
</div>
```

**生成的容器选择器：**
```css
div.bh-form-group[data-field="ZRS"]
```

**为什么稳定？**
- ✅ `div` 标签不变
- ✅ `.bh-form-group` 是业务系统的标准 class
- ✅ `[data-field="ZRS"]` 是开发者定义的语义属性
- ✅ 这个组合在页面刷新后仍然存在

---

## 🔑 核心技术 3：多层次提取策略

### 为什么需要多层次？

即使容器选择器设计得很稳定，也可能因为：
- 页面结构改版
- 框架升级
- CSS 类名重构

导致选择器失效。因此需要**多重保险机制**。

### 提取策略（按优先级）

#### 🥇 策略 1：容器选择器 + Label 验证（最可靠）

```typescript
// 1. 通过容器选择器找到容器
const container = document.querySelector('div.bh-form-group[data-field="ZRS"]');

// 2. 在容器内找到 input
const input = container.querySelector('input');

// 3. 验证 label 是否匹配
const label = container.querySelector('.bh-form-label');
if (label.textContent.trim() === '总人数') {
  // ✅ 确认找到正确的输入框
}
```

**优点**：
- 结构稳定性 + 语义验证
- 即使有多个相同 name 的输入框也能区分

#### 🥈 策略 2：Name 属性 + Label 验证（备选）

```typescript
// 1. 通过 name 属性找到候选输入框
const candidates = document.querySelectorAll('input[name="ZRS"]');

// 2. 遍历候选，找到 label 匹配的
for (const input of candidates) {
  const container = input.closest('.bh-form-group');
  const label = container?.querySelector('.bh-form-label');
  if (label?.textContent.trim() === '总人数') {
    // ✅ 通过 label 确认这是正确的输入框
  }
}
```

**适用场景**：
- 容器选择器失效时
- name 属性相对稳定的表单

#### 🥉 策略 3：Placeholder 匹配（最后手段）

```typescript
// 通过 placeholder 查找
const input = document.querySelector('input[placeholder="请输入总人数"]');
```

**局限性**：
- placeholder 可能变化（多语言、文案调整）
- 不够精确

### 提取流程图

```
输入：SavedConfig { containerSelector, label, name, placeholder }
  ↓
尝试 1：容器选择器 + label 验证
  ↓ 失败
尝试 2：name 属性 + label 验证
  ↓ 失败
尝试 3：placeholder 匹配
  ↓ 失败
返回：未找到
```

---

## 🔑 核心技术 4：语义信息辅助定位

### Label 的重要性

**Label 文本通常是最稳定的**，因为：
- 它是给用户看的，轻易不会改
- 即使底层 DOM 结构变化，label 文本也不变
- 可以用来验证是否找到了正确的输入框

### 实际案例

**场景**：页面有多个 `input[name="count"]`

```html
<!-- 输入框 1 -->
<div class="bh-form-group">
  <label>总人数</label>
  <input name="count" />
</div>

<!-- 输入框 2 -->
<div class="bh-form-group">
  <label>完成人数</label>
  <input name="count" />
</div>
```

**通过 label 区分**：

```typescript
// ✅ 精确定位到"总人数"输入框
const targetInput = Array.from(document.querySelectorAll('input[name="count"]'))
  .find(input => {
    const label = input.closest('.bh-form-group')?.querySelector('label');
    return label?.textContent.trim() === '总人数';
  });
```

### 保存的元数据

```typescript
interface SavedConfig {
  containerSelector: string;  // 容器选择器
  label: string | null;       // ⭐ 用于验证
  name: string | null;        // 备选方案
  placeholder: string | null; // 最后手段
}
```

---

## 🎯 完整工作流程

### 阶段 1：扫描（Scan）

```
用户点击"扫描" 
  ↓
1. 查找所有可见输入框
   querySelectorAll('input:not([type="hidden"])...')
  ↓
2. 对每个输入框：
   a. 向上查找稳定容器
   b. 生成容器选择器
   c. 提取 label/name/placeholder
   d. 高亮显示 + 编号
  ↓
3. 返回 InputInfo[]
```

### 阶段 2：保存（Save）

```
用户选择需要的输入框，点击"保存配置"
  ↓
1. 根据选中的索引过滤 InputInfo
  ↓
2. 构建 SavedConfig[] 
   - containerSelector: 生成的稳定选择器
   - label: 用于验证
   - name: 备选方案
   - placeholder: 最后手段
  ↓
3. 存储到 localStorage/Storage API
```

### 阶段 3：提取（Extract）

```
页面刷新后，用户点击"提取"
  ↓
读取 SavedConfig[]
  ↓
对每个配置：
  ├─ 尝试 1：容器选择器 + label 验证 ✅
  ├─ 尝试 2：name 属性 + label 验证
  └─ 尝试 3：placeholder 匹配
  ↓
高亮找到的输入框，标记 ✓
  ↓
返回 ExtractResult[]
```

---

## 💡 关键技术要点总结

### 1. 向上查找容器，而非直接定位输入框
- ❌ 直接定位：`#jqxWidgetXXXX` → 不稳定
- ✅ 容器定位：`div.bh-form-group[data-field="ZRS"] > input` → 稳定

### 2. 选择器生成要智能过滤
- 排除动态 ID/Class
- 优先使用语义属性（`data-*`）
- 按需添加 `nth-child`

### 3. 多层次备选机制
- 主策略：容器选择器
- 备选 1：name 属性
- 备选 2：placeholder
- 关键：都要结合 label 验证

### 4. 语义信息是核心
- Label 文本最稳定
- 用于验证是否找到正确元素
- 可区分相同 name/class 的输入框

### 5. 容错与降级
- 选择器失效时自动尝试下一个策略
- 日志记录每个输入框的查找方式
- 失败时提示具体原因

---

## 🔧 适用场景

✅ **动态 ID 生成的表单**（jqx、EasyUI 等）  
✅ **前端框架渲染的页面**（React、Vue 等）  
✅ **重复刷新后需要重新定位的场景**  
✅ **多个相同 name 的输入框需要区分**  
✅ **页面结构经常变化的"烂网页"**  

---

## 📚 延伸阅读

- **CSS 选择器稳定性**：为什么 `data-*` 属性比 class 更稳定
- **DOM 遍历策略**：`.closest()` vs `.querySelector()`
- **选择器性能优化**：如何减少查询次数
- **MutationObserver**：监听 DOM 变化自动重新定位

---

**Made with 🧠 for dynamic web automation**

*Anlo - 让动态网页的自动化变得可靠*