# 🎯 输入框映射工具 - 浏览器插件

一个强大的浏览器侧边栏插件，用于扫描、记录和重新定位网页输入框。特别适用于那些动态生成ID、难以定位元素的"烂网页"自动化操作。

## 📦 功能特性

- ✅ **智能扫描**：扫描页面所有输入框，自动编号和高亮
- 📍 **容器定位**：通过稳定的容器选择器定位，而非易变的输入框ID
- 💾 **配置保存**：保存选中的输入框配置，跨页面刷新使用
- 🎯 **精准提取**：根据保存的配置重新定位输入框
- 📤 **配置导入导出**：配置可导出/导入，方便复用
- 🎨 **可视化操作**：高亮显示、编号标记，直观易用

## 🚀 安装步骤

### 方法一：开发者模式加载（推荐）

1. 打开 Chrome/Edge 浏览器
2. 访问扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 开启右上角的**"开发者模式"**
4. 点击**"加载已解压的扩展程序"**
5. 选择本项目的**根目录**（包含 manifest.json 的文件夹）
6. 安装完成！

### 图标生成（首次使用）

由于 Git 无法包含图标文件，首次使用需要生成图标：

1. 在浏览器中打开 `create-icons.html`
2. 会自动下载三个图标文件：`icon16.png`, `icon48.png`, `icon128.png`
3. 将这三个图标文件放到项目根目录
4. 刷新扩展程序页面

**或者**，如果不想生成图标，可以删除 manifest.json 中的 icons 配置：

```json
// 删除这几行
"icons": {
  "16": "icon16.png",
  "48": "icon48.png",
  "128": "icon128.png"
}
```

## 📖 使用指南

### 第一步：打开插件

1. 打开需要操作的网页
2. 点击浏览器工具栏的插件图标（或按钮）
3. 侧边栏面板会自动打开

### 第二步：首次配置（只需一次）

#### 1. 扫描输入框

- 点击 **"扫描当前页面所有输入框"**
- 页面上所有输入框会被高亮并显示编号 `#0`, `#1`, `#2`...
- 侧边栏会显示输入框列表，包含：
  - 序号
  - 标签名称
  - name 属性
  - 类型
  - 容器路径

#### 2. 选择需要的输入框

- 在侧边栏列表中**点击**需要的输入框
- 被选中的输入框会变成**绿色**
- 可以多选
- 再次点击可取消选择

#### 3. 保存配置

- 点击 **"保存选中的输入框配置"**
- 系统会记录这些输入框的**容器选择器**
- 配置会自动保存到浏览器存储

#### 4. 导出配置（可选）

- 点击 **"导出配置到剪贴板"**
- 配置 JSON 会复制到剪贴板
- 可以保存到文件供其他地方使用

### 第三步：后续使用（每次刷新后）

1. 打开插件侧边栏
2. 点击 **"根据配置重新提取输入框"**
3. 系统会根据保存的容器选择器找到对应的输入框
4. 找到的输入框会被**橙色**高亮

### 其他功能

- **导入配置**：在文本框粘贴配置 JSON，点击"导入配置"
- **清除高亮**：清除页面上的所有高亮和标记
- **清除配置**：删除所有保存的配置（需确认）

## 🎬 使用场景示例

### 场景：某企业内部系统填表

**问题**：
- 页面输入框 ID 每次刷新都变化（如 `jqxWidget_d6e0a20d`）
- 需要定期填写大量表单
- 传统选择器完全无法使用

**解决方案**：

```javascript
// 1. 首次配置（在浏览器控制台）
// 使用插件扫描并保存配置后，导出配置

// 2. 在自动化脚本中使用（Puppeteer/Playwright）
const config = [
  {
    "label": "总人数",
    "containerSelector": "div.bh-form-group[data-field='ZRS']",
    "fallbackName": "ZRS"
  },
  {
    "label": "联系电话",
    "containerSelector": "div.bh-form-group[data-field='LXDH']",
    "fallbackName": "LXDH"
  }
];

// 3. 注入提取脚本
await page.evaluate((cfg) => {
  const inputs = window.InputMapperContent.extractByConfig(cfg);
  inputs[0].element.value = '100';
  inputs[1].element.value = '13800138000';
}, config);
```

## 🔧 工作原理

### 为什么容器选择器更稳定？

很多"烂网页"的问题：
- ❌ 输入框 ID 动态生成（`jqxWidget_随机字符`）
- ❌ class 包含随机数字
- ❌ 每次刷新都变化

但是：
- ✅ 输入框的**父容器**通常有稳定的 class
- ✅ 容器的 `data-*` 属性很少变化
- ✅ 页面结构层级相对固定

**本插件的策略**：
1. 定位到稳定的容器（如 `.bh-form-group[data-field='ZRS']`）
2. 从容器内查找输入框（`container.querySelector('input')`）
3. 备用方案：使用 name 属性或 placeholder

### 选择器生成算法

```javascript
// 优先级
1. 稳定的容器 ID（排除动态生成的）
2. 稳定的 class（排除 jqx、random、动态数字）
3. data-field, data-role 等属性
4. 最多3层防止选择器过长
5. 备用：name 属性
```

## 📂 文件结构

```
input-mapper-extension/
├── manifest.json          # 插件配置文件
├── background.js          # 后台服务脚本
├── content.js            # 注入到网页的脚本（核心逻辑）
├── sidepanel.html        # 侧边栏界面
├── sidepanel.js          # 侧边栏逻辑
├── create-icons.html     # 图标生成工具
├── icon16.png            # 16x16 图标
├── icon48.png            # 48x48 图标
├── icon128.png           # 128x128 图标
└── README.md             # 本文件
```

## 🛠️ 核心 API

插件向网页注入 `window.InputMapperContent` 对象，包含以下方法：

### `scanAll()`
扫描页面所有输入框，返回输入框信息数组。

```javascript
const inputs = window.InputMapperContent.scanAll();
// 返回: [{ index, label, name, type, containerPath }, ...]
```

### `saveByIndexes(indexes)`
根据序号数组保存配置。

```javascript
const config = window.InputMapperContent.saveByIndexes([0, 2, 5]);
// 保存序号 0, 2, 5 的输入框配置
```

### `extractByConfig(config)`
根据配置提取输入框。

```javascript
const inputs = window.InputMapperContent.extractByConfig(config);
// 返回: [{ configIndex, label, element, value }, ...]

// 操作提取的输入框
inputs[0].element.value = '测试数据';
inputs[0].element.dispatchEvent(new Event('input', { bubbles: true }));
```

### `clearHighlight()`
清除所有高亮和标记。

```javascript
window.InputMapperContent.clearHighlight();
```

## 💡 高级使用

### 与 Puppeteer 结合

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('https://example.com/form');
  
  // 注入配置
  const config = require('./saved-config.json');
  
  // 提取并填充
  await page.evaluate((cfg) => {
    const inputs = window.InputMapperContent.extractByConfig(cfg);
    inputs.forEach((inp, i) => {
      inp.element.value = `数据${i}`;
      inp.element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }, config);
  
  await browser.close();
})();
```

### 与 Playwright 结合

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://example.com/form');
  
  const config = require('./saved-config.json');
  
  await page.evaluate((cfg) => {
    return window.InputMapperContent.extractByConfig(cfg);
  }, config);
  
  await browser.close();
})();
```

## ⚠️ 注意事项

1. **首次使用需要配置**：在目标网页上至少运行一次扫描和保存
2. **页面结构变化**：如果网页大改版，可能需要重新配置
3. **动态加载**：如果输入框是异步加载的，等待加载完成后再扫描
4. **跨域限制**：插件需要相应的权限才能访问某些网站

## 🐛 常见问题

### Q: 扫描不到输入框？
A: 确保输入框已经加载完成。某些页面需要等待几秒或手动触发显示。

### Q: 提取失败？
A: 
1. 检查页面结构是否发生变化
2. 尝试重新扫描和保存配置
3. 查看浏览器控制台的错误信息

### Q: 配置保存在哪里？
A: 配置保存在浏览器的 `chrome.storage.local` 中，卸载插件会清除。建议导出备份。

### Q: 支持哪些浏览器？
A: 支持 Chrome、Edge 等基于 Chromium 的浏览器（Manifest V3）。

## 📜 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️ for automation lovers**

