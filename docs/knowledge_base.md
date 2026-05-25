# 全栈开发工程师技术手册

> 本文档收录了公司核心技术规范、架构设计原则、开发流程与常见问题解决方案，供研发团队查阅参考。

---

## 1. 前端架构规范

### 1.1 技术栈选型原则

公司前端项目统一采用以下技术栈：

- **框架**：Vue 3（Composition API）或 React 18（Hooks）
- **语言**：TypeScript 5.0+，严格模式开启
- **构建工具**：Vite 5.0+，废弃 Webpack 新项目
- **UI 组件库**：Element Plus（Vue）或 Ant Design 5.x（React）
- **状态管理**：Pinia（Vue）或 Zustand（React），废弃 Vuex / Redux
- **路由**：Vue Router 4 或 React Router 6
- **CSS**：Tailwind CSS 3.x + CSS Modules，废弃 Less / Sass 新项目

### 1.2 项目目录结构

所有前端项目必须遵循以下目录规范：

```
src/
├── api/              # 接口请求层，按业务模块拆分
├── assets/           # 静态资源（图片、字体、图标）
├── components/       # 公共组件
│   ├── base/         # 基础组件（Button、Input、Modal）
│   └── business/     # 业务组件（UserCard、OrderTable）
├── composables/      # 组合式函数（Vue）或 hooks/（React）
├── layouts/          # 布局组件
├── pages/            # 页面组件，与路由一一对应
├── router/           # 路由配置
├── stores/           # 状态管理
├── styles/           # 全局样式、变量、混入
├── utils/            # 工具函数
│   ├── request.ts    # Axios 封装
│   ├── storage.ts    # 本地存储封装
│   └── validate.ts   # 表单校验
└── types/            # 全局类型定义
```

### 1.3 代码规范

- 组件文件使用大驼峰命名：`UserProfile.vue` / `OrderTable.tsx`
- 组合式函数以 `use` 开头：`useAuth.ts`、`useTable.ts`
- API 文件以业务模块命名：`user.api.ts`、`order.api.ts`
- 禁止使用 `any` 类型，必须使用具体类型或 `unknown`
- 单行代码不超过 120 字符，函数不超过 50 行

---

## 2. 后端开发规范

### 2.1 Spring Boot 项目结构

```
com.company.project/
├── controller/         # 控制层，仅负责参数校验和响应封装
├── service/          # 业务层
│   ├── impl/         # 实现类
│   └── dto/          # 数据传输对象
├── mapper/           # 数据访问层（MyBatis-Plus）
├── entity/           # 实体类
├── config/           # 配置类
├── common/           # 公共常量、枚举、异常
├── utils/            # 工具类
└── aspect/           # AOP 切面
```

### 2.2 接口设计规范（RESTful）

| 操作 | HTTP 方法 | URL 示例 | 说明 |
|------|----------|---------|------|
| 查询列表 | GET | `/api/users?page=1&size=20` | 分页参数统一 |
| 查询详情 | GET | `/api/users/{id}` | |
| 创建 | POST | `/api/users` | Body 传 JSON |
| 更新 | PUT | `/api/users/{id}` | 全量更新 |
| 删除 | DELETE | `/api/users/{id}` | 逻辑删除用 `is_deleted` 字段 |

统一响应格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1716192000000
}
```

错误码规范：
- `200`：成功
- `400`：请求参数错误
- `401`：未登录或 Token 过期
- `403`：无权限
- `404`：资源不存在
- `500`：服务器内部错误
- `1001~1999`：业务错误（按模块划分）

### 2.3 数据库规范

- 表名使用小写下划线：`user_profile`、`order_item`
- 主键统一用 `BIGINT` 自增，命名 `id`
- 逻辑删除字段统一命名 `is_deleted`，类型 `TINYINT(1)`
- 创建时间 `create_time`，更新时间 `update_time`，类型 `DATETIME`
- 索引命名：`idx_表名_字段名`
- 禁止在代码中手写 SQL 拼接，必须使用 MyBatis-Plus 或 QueryDSL

---

## 3. AI 辅助开发流程

### 3.1 AI 工具使用规范

团队统一使用以下 AI 工具提升研发效率：

| 场景 | 推荐工具 | 使用规范 |
|------|---------|---------|
| 日常编码 | Cursor / GitHub Copilot | 生成代码必须经过 Review，禁止直接合入 |
| 代码审查 | Claude Code / ChatGPT | 用于发现潜在 Bug、优化建议 |
| 文档生成 | Kimi / 通义千问 | 生成后人工校对技术准确性 |
| 测试生成 | Cursor + GPT-4 | 生成单元测试覆盖率需达 80%+ |

### 3.2 Prompt 工程规范

与 AI 协作时，必须遵循以下 Prompt 模板：

**1. 需求澄清模板**
```
角色：你是一位资深{技术栈}开发工程师。
背景：我们正在开发{项目名}，使用{技术栈}。
需求：需要实现{功能描述}。
约束：
- 必须使用 TypeScript 严格模式
- 兼容 Chrome 90+
- 代码需符合公司目录规范
请输出：技术方案 + 核心代码 + 潜在风险点。
```

**2. 代码重构模板**
```
角色：代码重构专家。
任务：重构以下代码，要求：
- 提升可读性
- 消除重复代码
- 添加类型安全
- 保持原有功能不变
原始代码：
{粘贴代码}
```

**3. Bug 定位模板**
```
现象：{描述报错现象}
环境：{浏览器/Node版本}
相关代码：
{粘贴代码}
请分析可能原因并给出修复方案。
```

### 3.3 AI 生成代码审查清单

所有 AI 生成的代码合入前必须通过以下检查：

- [ ] 是否存在幻觉 API（调用了不存在的函数或库）
- [ ] 类型定义是否完整，有无隐式 any
- [ ] 错误处理是否完善（try-catch、边界条件）
- [ ] 性能是否有明显退化（循环嵌套、重复计算）
- [ ] 安全漏洞（XSS、SQL 注入、敏感信息泄露）
- [ ] 是否符合公司代码规范（命名、目录结构）

---

## 4. 微前端架构规范

### 4.1 微前端选型

公司统一使用 **wujie** 作为微前端框架，原因如下：

- 基于 WebComponent + iframe 方案，隔离性强
- 支持 Vue2 / Vue3 / React / Angular 异构系统共存
- 样式隔离完善，子应用无需改造
- 通信机制简单：基于 EventBus + Props 注入

### 4.2 基座应用职责

基座应用（主应用）负责：

1. **统一登录鉴权**：OAuth2 + JWT，Token 刷新机制
2. **菜单与路由管理**：动态加载子应用路由表
3. **全局状态共享**：用户信息、权限点、系统配置
4. **公共依赖共享**：Vue / React / Element Plus 等通过 externals 共享
5. **全局异常监控**：Sentry 接入，统一报错上报

### 4.3 子应用接入规范

子应用必须满足以下条件才能接入微前端：

- 入口文件导出 `bootstrap / mount / unmount` 生命周期函数
- 路由使用 `history` 模式，基座通过 `props.base` 注入基础路径
- CSS 使用 scoped 或 CSS Modules，禁止全局样式污染
- 资源路径使用相对路径或 `publicPath` 动态配置

### 4.4 主子应用通信

```typescript
// 基座发送消息
window.$wujie?.bus.$emit('global-message', { type: 'logout' });

// 子应用监听
window.$wujie?.bus.$on('global-message', (data) => {
  if (data.type === 'logout') {
    // 处理登出
  }
});
```

禁止直接操作 DOM 跨应用通信，所有交互必须通过 EventBus。

---

## 5. 性能优化规范

### 5.1 前端性能指标

项目上线前必须达到以下性能标准：

| 指标 | 目标值 | 测量工具 |
|------|--------|---------|
| FCP（首次内容绘制） | < 1.2s | Lighthouse |
| LCP（最大内容绘制） | < 2.5s | Lighthouse |
| TTI（可交互时间） | < 3.5s | Lighthouse |
| CLS（累积布局偏移） | < 0.1 | Lighthouse |
| 首屏 JS 体积 | < 200KB（gzip） | Webpack Bundle Analyzer |
| 图片资源 | WebP 格式，懒加载 | Chrome DevTools |

### 5.2 优化手段清单

**加载优化**
- 路由懒加载：`() => import('./pages/User.vue')`
- 组件异步加载：大型表格、图表组件延迟加载
- 资源预加载：关键路由 `prefetch`，当前路由 `preload`
- 分包策略：第三方库单独打包，利用浏览器缓存

**运行时优化**
- 虚拟滚动：长列表使用 `vue-virtual-scroller` 或 `react-window`
- 防抖节流：搜索输入 300ms 防抖，滚动事件 16ms 节流
- Memo 缓存：React 用 `useMemo` / `useCallback`，Vue 用 `computed` / `shallowRef`
- Web Worker：复杂计算（Excel 解析、大数据排序）移至 Worker

**网络优化**
- HTTP 缓存：静态资源 1 年，`index.html` 不缓存
- CDN 加速：静态资源部署至 CDN，启用 Brotli 压缩
- 接口聚合：减少请求数，GraphQL 或 BFF 层聚合

---

## 6. 安全规范

### 6.1 前端安全

- **XSS 防护**：所有用户输入必须转义，使用 `DOMPurify` 清理 HTML
- **CSRF 防护**：接口统一携带 Token 头部，敏感操作二次验证
- **敏感信息**：禁止前端硬编码 API Key、数据库密码，使用环境变量
- **iframe 安全**：微前端子应用设置 `sandbox` 属性，限制弹窗和表单提交

### 6.2 后端安全

- **SQL 注入**：必须使用参数化查询，禁止字符串拼接 SQL
- **越权访问**：每个接口校验用户权限，敏感数据加行级权限控制
- **密码存储**：使用 BCrypt 加密，禁止明文或 MD5 存储
- **接口限流**：登录接口 5 分钟最多 5 次，防止暴力破解
- **日志脱敏**：手机号、身份证号、银行卡号中间位打码存储

---

## 7. Git 工作流与发布规范

### 7.1 分支模型

采用 **Git Flow** 简化版：

```
main        # 生产分支，只能合并，禁止直接提交
├── develop # 开发分支，日常开发基于此
│   ├── feature/user-auth     # 功能分支
│   ├── feature/order-list  # 功能分支
│   └── hotfix/login-bug    # 热修复分支
└── release/v2.1.0            # 发布分支
```

### 7.2 提交规范

提交信息必须遵循 **Conventional Commits**：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型说明：
- `feat`：新功能
- `fix`：修复 Bug
- `docs`：文档更新
- `style`：代码格式（不影响功能）
- `refactor`：重构
- `perf`：性能优化
- `test`：测试相关
- `chore`：构建/工具链

示例：
```
feat(user): 添加用户登录页面

- 实现手机号 + 验证码登录
- 集成极验行为验证
- 登录成功后跳转首页

Closes #123
```

### 7.3 发布流程

1. 从 `develop` 切出 `release/vX.Y.Z`
2. 测试环境验证，修复 Bug（合并回 develop）
3. 打 Tag：`git tag -a v2.1.0 -m "release version 2.1.0"`
4. 合并 `release` 到 `main` 和 `develop`
5. Jenkins 自动构建并部署生产环境
6. 生产环境灰度发布，监控 30 分钟无异常后全量

---

## 8. 常见问题 FAQ

### Q1: Vue 3 项目如何兼容旧版浏览器？

使用 `@vitejs/plugin-legacy` 插件自动生成传统浏览器兼容包，并在 `index.html` 中通过 `module/nomodule` 方式加载。

### Q2: TypeScript 严格模式下第三方库没有类型声明怎么办？

在 `src/types/declarations.d.ts` 中声明模块：
```typescript
declare module 'some-untyped-lib' {
  const content: any;
  export default content;
}
```
优先寻找 `@types/xxx` 社区类型包。

### Q3: 微前端子应用独立运行时如何获取基座数据？

```typescript
const props = window.$wujie?.props || {};
const userInfo = props.userInfo || JSON.parse(localStorage.getItem('user') || '{}');
```
独立运行时通过 `localStorage` 兜底，保证子应用可单独开发调试。

### Q4: AI 生成的代码出现幻觉 API 怎么处理？

1. 将报错信息粘贴回 AI，要求修正
2. 手动查阅官方文档确认 API 签名
3. 将修正后的正确代码保存到团队 Prompt 模板库，避免重复犯错

### Q5: 后端接口响应慢如何定位？

1. 开启 MyBatis-Plus 日志，检查 SQL 执行时间
2. 使用 Arthas 或 Spring Boot Actuator 监控接口耗时
3. 检查是否缺少索引、N+1 查询、大字段全量返回
4. 慢接口超过 500ms 必须加 Redis 缓存或异步处理

### Q6: 如何评估是否引入新的前端框架或库？

必须同时满足以下条件：
- GitHub Star > 5k 或 npm 周下载量 > 10k
- 最近 3 个月有活跃提交
- 有完整的 TypeScript 类型支持
- 与现有技术栈兼容，不引入重复依赖
- 团队内至少 2 人评估通过

---

## 9. 技术雷达（2026 Q2）

团队正在评估或已采纳的新技术：

| 技术 | 阶段 | 说明 |
|------|------|------|
| Vite 6 | 采纳 | 构建速度提升 30% |
| React Server Components | 试验 | 减少客户端 JS 体积 |
| Bun | 评估 | 替代 Node.js 运行时 |
| AI Code Review Bot | 采纳 | 自动审查 PR，拦截低质量代码 |
| WebAssembly | 评估 | 3D 渲染、图像处理场景 |
| htmx | 观望 | 简化交互，减少 JS 依赖 |

---

*文档维护：技术委员会*  
*最后更新：2026-05-20*  
*版本：v3.2.1*
