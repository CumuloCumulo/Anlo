# 🎯 Anlo - 输入框映射工具

**现代化版本：TypeScript + React + Material-UI + Webpack**

一个强大的浏览器侧边栏插件，用于扫描、记录和重新定位网页输入框。特别适用于那些动态生成ID、难以定位元素的"烂网页"自动化操作。

## 📋 项目特点

- ✅ **TypeScript** - 完整的类型安全
- ⚛️ **React 18** - 现代化 UI 框架
- 🎨 **Material-UI 5** - 优雅的 Material Design 组件库
- 📦 **Webpack 5** - 优化的构建打包
- 🎨 **组件化设计** - 易于维护和扩展
- 🔄 **双向消息通信** - Sidepanel ↔ Content Script ↔ Background
- 📐 **智能定位** - 自动生成稳定的选择器

## 🏗️ 项目结构

```
Anlo/
├── src/
│   ├── types/                    # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/                    # 工具函数
│   │   ├── selectorGenerator.ts  # 选择器生成
│   │   └── messaging.ts          # 消息通信
│   ├── scripts/                  # 脚本文件
│   │   ├── content.ts            # 内容脚本（注入到页面）
│   │   └── background.ts         # 后台服务
│   └── sidepanel/                # 侧边栏 UI
│       ├── index.tsx             # 入口
│       ├── App.tsx               # 主应用
│       ├── styles.css            # 样式
│       ├── index.html            # HTML 模板
│       └── components/           # React 组件
│           ├── ScanSection.tsx
│           ├── SelectSection.tsx
│           ├── ConfigSection.tsx
│           └── UtilSection.tsx
├── public/                       # 静态资源
│   ├── manifest.json
│   └── icons/                    # 插件图标
├── dist/                         # 构建输出
├── webpack.config.js             # Webpack 配置
├── tsconfig.json                 # TypeScript 配置
├── package.json                  # 项目依赖
└── README.md
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式（自动监听变更）

```bash
npm run watch
```

或者构建一次：

```bash
npm run build:dev
```

### 3. 生产构建

```bash
npm run build
```

### 4. 安装到浏览器

#### Chrome / Edge:
1. 打开扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

2. 开启右上角的**"开发者模式"**

3. 点击**"加载已解压的扩展程序"**

4. 选择 `dist` 文件夹

5. 完成！🎉

## 📖 核心模块说明

### 🔤 类型定义（`src/types/index.ts`）

定义了整个系统的数据结构：
- `InputInfo` - 扫描的输入框信息
- `SavedConfig` - 保存的配置
- `ExtractResult` - 提取结果
- `Message` - 消息格式

### 🎨 选择器生成器（`src/utils/selectorGenerator.ts`）

核心的选择器生成逻辑：
- `generateStableSelector()` - 生成稳定选择器
- `findElementBySelector()` - 根据选择器查找元素
- 智能判断是否需要 nth-child
- 自动筛选稳定的 class 和属性

### 💬 消息通信（`src/utils/messaging.ts`）

处理不同脚本间的通信：
- `sendToContent()` - 从 sidepanel 发送到 content script
- `sendToBackground()` - 发送到后台服务
- `onMessage()` - 监听消息
- `executeInContent()` - 在页面上下文执行函数

### 📄 内容脚本（`src/scripts/content.ts`）

注入到每个网页的脚本：
- `scanAll()` - 扫描所有输入框
- `saveByIndexes()` - 根据索引保存配置
- `extractByConfig()` - 根据配置提取输入框
- `highlightByIndex()` - 高亮指定输入框
- `clearHighlight()` - 清除高亮

### 🎯 后台服务（`src/scripts/background.ts`）

处理插件级别的事件：
- 监听插件图标点击
- 管理侧边栏行为
- 处理标签页变化

### ⚛️ React 组件（`src/sidepanel/`）

现代化的 UI：
- `App.tsx` - 主应用逻辑和状态管理
- `ScanSection.tsx` - 扫描功能区
- `SelectSection.tsx` - 选择输入框区
- `ConfigSection.tsx` - 配置管理区
- `UtilSection.tsx` - 工具与设置区

## 🔄 工作流程

### 1️⃣ 扫描阶段

```typescript
// 打开 sidepanel
// 点击"扫描当前页面所有输入框"
// ↓
// Content Script 执行 scanAll()
// ↓
// 返回所有输入框信息
```

### 2️⃣ 选择阶段

```typescript
// 在列表中点击勾选需要的输入框
// ↓
// React 状态更新，UI 实时反映
// ↓
// 点击"保存配置"
```

### 3️⃣ 保存阶段

```typescript
// Content Script 执行 saveByIndexes(indexes)
// ↓
// 生成稳定的容器选择器
// ↓
// 保存到 SavedConfig[]
// ↓
// 存储到浏览器存储（LocalStorage/Storage API）
```

### 4️⃣ 提取阶段

```typescript
// 刷新页面后
// 打开 sidepanel
// 点击"根据配置重新提取输入框"
// ↓
// Content Script 执行 extractByConfig(config)
// ↓
// 使用多层次的查找策略：
//   1. 容器选择器 + label 验证
//   2. name 属性 + label 验证
//   3. placeholder 查找
// ↓
// 返回找到的输入框元素
```

## 🔧 开发指南

### 添加新的消息类型

在 `src/scripts/content.ts` 中的 `initializeListeners()` 方法中添加新的 case：

```typescript
case 'NEW_ACTION':
  response = this.newAction(payload);
  break;
```

### 创建新的 React 组件

1. 在 `src/sidepanel/components/` 中创建文件
2. 使用 TypeScript 定义 Props 接口
3. 在 `App.tsx` 中导入和使用

```typescript
import { Paper, Button, Typography } from '@mui/material';

interface NewComponentProps {
  prop1: string;
  prop2: () => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({ prop1, prop2 }) => {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">{prop1}</Typography>
      <Button onClick={prop2}>Click me</Button>
    </Paper>
  );
};
```

### 使用 Material-UI

所有 UI 组件都使用 Material-UI。主题已在 `src/sidepanel/index.tsx` 中配置：

- **颜色主题**: 自定义的蓝色、绿色、灰色调板
- **排版**: 使用 Roboto 字体
- **响应式设计**: 所有组件都支持响应式布局
- **图标**: 使用 `@mui/icons-material` 中的 Material Icons

在组件中使用 `sx` prop 进行样式定制：

```typescript
<Box sx={{ 
  p: 2,           // padding
  mb: 2,          // marginBottom
  bgcolor: 'primary.main',  // backgroundColor
  borderRadius: 1 // borderRadius
}}>
  内容
</Box>
```

### 调试技巧

1. **查看 Console 日志**
   - Sidepanel: 右键 → 检查
   - Content Script: 在网页上右键 → 检查 → Console
   - Background: `chrome://extensions/` → Anlo → 背景页面

2. **设置断点**
   - 在 DevTools 中设置断点
   - 使用 `debugger;` 语句

3. **查看消息传递**
   - 在 `messaging.ts` 中添加日志
   - 在 content.ts 中添加日志

## 📦 构建输出

运行 `npm run build` 后，`dist/` 文件夹包含：

```
dist/
├── manifest.json      # 插件配置
├── sidepanel.html     # 侧边栏页面
├── sidepanel.js       # 侧边栏脚本（包含 React）
├── content.js         # 内容脚本
├── background.js      # 后台脚本
└── icons/             # 插件图标
```

## 🎯 后续功能迭代方向

### 短期计划
- [ ] 支持更多元素类型（按钮、链接、下拉框等）
- [ ] 本地存储优化（使用 IndexedDB）
- [ ] 配置管理界面增强
- [ ] 快捷键支持

### 中期计划
- [ ] 云端配置同步
- [ ] 配置模板市场
- [ ] AI 辅助定位
- [ ] 团队协作功能

### 长期规划
- [ ] 全网页自动化平台
- [ ] API 接口暴露
- [ ] 插件市场生态

## 💡 技术栈

- **语言**: TypeScript 5.3
- **UI 框架**: React 18
- **组件库**: Material-UI 5
- **样式引擎**: Emotion
- **构建工具**: Webpack 5
- **API**: Chrome Extension API Manifest V3
- **图标库**: Material Icons

## 📝 注意事项

1. **权限声明**：需要 `<all_urls>` 权限才能在所有网页上运行

2. **Content Security Policy**：某些网站可能有严格的 CSP，会阻止脚本运行

3. **性能**: 扫描大量输入框时可能会有延迟，考虑添加分页

4. **跨域**: Content Script 只能访问当前标签页的 DOM

## 🤝 贡献指南

欢迎贡献代码！请：

1. Fork 此项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

MIT License

## 🙋 常见问题

### Q: 如何在开发时快速重新加载？
A: 在扩展管理页面点击"刷新"按钮，或设置自动重新加载。

### Q: TypeScript 编译错误？
A: 运行 `npm run clean && npm run build` 重新构建。

### Q: 侧边栏不显示？
A: 确保 manifest.json 中的 `side_panel` 配置正确，并检查 sidepanel.html。

### Q: Content Script 没有运行？
A: 检查浏览器 Console，查看是否有错误消息。

---

**Made with ❤️ for web automation lovers**

*Anlo - 让烂网页的自动化变得简单*

