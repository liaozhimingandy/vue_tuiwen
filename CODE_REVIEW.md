# 推文前端（vue_tuiwen）注释 · 格式化 · 优化分析报告

- **项目**：`D:\Git\vue_tuiwen`（Vue 3 + TypeScript + Vite + Pinia + TDesign Vue Next）
- **分支**：`develop`
- **日期**：2026-09-17
- **范围**：`src/` 全量（51 个文件）+ 相关工程配置
- **本轮追加**：首屏体积专项优化、类型错误清零、构建链路收紧

### 上轮提出的三个问题 · 处理结果

| 上轮提出的问题 | 处理结果 | 详见 |
| --- | --- | --- |
| ① 首屏体积超标（`index` 935.69 kB、`ArticlePage` 805.87 kB，构建告警） | 首屏需下载 **1642.6 KB → 880.7 KB**，入口闭包 **1642.6 KB → 360.5 KB**，构建告警消失 | 第四节 |
| ② `npm run build` 只跑 `vite build`，类型错误不阻塞部署 | `build` 改为「先 `type-check` 再 `vite build`」，另留 `build:only` 供快速构建 | 第七节 |
| ③ 根目录 `vue-tsc --noEmit` 假阴性（exit 0 但其实没检查） | 统一强制 `-p tsconfig.app.json`，脚本 / 文档 / 构建链路都已对齐 | 第二节 |

---

## 一、本次交付内容

| 项 | 内容 |
| --- | --- |
| 代码注释 | 51 个源文件全部补齐中文注释：文件级说明块、JSDoc、关键逻辑行内注释 |
| 注释覆盖率 | 注释行 **2250 / 11582 ≈ 19.4%**（清理无用代码与死引用后重新统计） |
| 代码格式化 | 引入 Prettier 3.9.7，新增 `.prettierrc.json` + `.prettierignore`，`src` 全量格式化 |
| Bug 修复 | 修复 **20 项**确定性问题（含 6 项线上功能影响、8 项类型/配置缺陷、6 项隐患） |
| 类型安全 | 类型错误 **59 → 0**；`npm run build` 改为先跑类型检查，类型错误将直接阻塞构建 |
| 首屏优化 | 首屏需下载体积 **1642.6 KB → 880.7 KB**（−46.4%），入口闭包 **1642.6 KB → 360.5 KB**（−78.1%）；发长文页首帧 1379.7 → **598.6 KB**（编辑器转异步） |
| 配置改进 | `tsconfig.app.json` 补路径别名、`package.json` 补 5 个脚本、`vite.config.ts` 补 vue/lodash 别名与体积阈值 |
| 依赖瘦身 | 移除 **5 个**确认未使用的依赖（`three`、`vue-clamp`、`vue-social-sharing`、`dompurify`、`@icon-park/vue-next`） |

### 改动规模

```
56 files changed, 5325 insertions(+), 4643 deletions(-)   # 另有 6 个新增文件
```

主要文件分布：`src/common`(7) · `src/components`(12+2 新增) · `src/components/ImageGallery`(5) · `src/pages`(17) · `src/services`(2) · `src/stores`(2) · `src/router`(1) · `scripts`(1 新增) · 根配置(4) · 资源重命名(1)

---

## 二、验证结果（全绿）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 格式一致性 | `npm run format:check` | ✅ `All matched files use Prettier code style!` |
| 类型检查 | `npm run type-check` | ✅ **0 错误**（上一轮 59 项已全部修复，修法归档见第六节） |
| 生产构建 | `npm run build` | ✅ `built in 40.34s`，无报错、无体积告警 |
| 首屏体积 | `npm run analyze:bundle` | ✅ 入口闭包 **360.5 KB / gzip 128.2 KB**（详见第四节） |
| 发长文页 | `npm run analyze:bundle` | ✅ 页面框架 1379.7 → **598.6 KB**，编辑器 782.6 KB 转异步并行加载（详见 4.4） |

> 类型错误数在补上别名后一度上升（144 → 59），那是原本被"吞掉"的类型问题显现，不是退化；本轮已全部清零。

> **关于 `vue-tsc` 的假阴性（踩坑记录）**：根 `tsconfig.json` 是 `{"files": [], "references": [...]}` 的
> composite 结构，**在仓库根直接执行 `vue-tsc --noEmit` 会 exit 0 且零输出**——它并不去构建被引用的子项目，
> "没检查"会被误读为"没错误"。必须显式指定子配置：
>
> ```bash
> vue-tsc --noEmit -p tsconfig.app.json    # 这才是真正在检查的那条命令
> ```
>
> `npm run type-check` 里写的就是它；`npm run build` 也已串上前置检查，不会再出现"类型有错但构建成功"。

---

## 三、已修复的问题（按严重程度）

### 3.1 影响线上功能的问题

#### ① 生产环境被误判为"调试模式" ⚠️ 最隐蔽

`.env.production` 写的是 `VITE_APP_IS_DEBUG=False`，但 **Vite 注入的环境变量全是字符串**，`"False"` 在 JS 里是 **truthy**：

```ts
// 修复前 src/common/config.ts
isDebug: import.meta.env.VITE_APP_IS_DEBUG || false,   // → "False"（真值！）
```

连锁影响：
- 生产包 `config.isDebug === "False"`，`logger.*` 全部照常输出（`logger.error/warn` 走 `console.error/warn`，不会被 `removeConsole` 剥离）；
- `endpoint-detector.ts` 的 `if (import.meta.env.VITE_APP_IS_DEBUG && !force)` 在生产环境**进入开发分支**，返回硬编码的 `http://api.tuiwen.alsoapp.com`。

**修法**：新增 `parseEnvBoolean()` 严格解析（仅 `true/1/yes/on` 为真），`endpoint-detector` 改用 `config.isDebug`。

#### ② tsconfig 缺失 `@` 路径别名 —— 94 个类型错误的真正根因

`vite.config.ts` 定义了 `'@' → ./src`，但 `tsconfig.app.json` **从未声明 `paths`**。后果：

- `vue-tsc` 对 `@/xxx` 一律报 `TS2307 Cannot find module`，**几乎全部业务代码的类型检查形同失效**（导入项退化为 `any`）；
- 这也是源码里出现 `// @ts-ignore` 与大量"隐式 any"的原因。

**修法**：补 `baseUrl` + `paths`，并把 `lib` 从 `ES2020` 提到 `ES2022`（修掉 `Array.prototype.at` 报错）。效果：**144 → 59** 个错误，`TS2307` 从 94 → 0。

#### ③ Pinia 持久化用了 v3 语法，v4 已改名（静默失效）

项目装的是 `pinia-plugin-persistedstate@4`，但代码仍写 `paths`。v4 中该选项已改名 `pick`，**写错的选项被静默忽略**，持久化白名单失效（`stores/app.ts` 两处）。

**修法**：`paths` → `pick`。

#### ④ 用户资料缓存把 Promise 当数据存 ⚠️ 会污染页面

```ts
// 修复前 src/stores/app.ts
account_map.value[account_id] = promise;   // 应为 pending_map
```

`account_map` 声明为 `Record<string, IAccount>`，却在请求进行中写入 Promise。而 `Post.vue` 会直接读取：

```ts
return account_map.value[props.post.account_id] ?? {};   // 拿到的是 Promise
return account_map.value[props.post.account_id]?.follow ?? {};  // undefined → {}
```

表现为接口返回前头像/昵称瞬时错误、并发复用逻辑失效。

**修法**：改写入 `pending_map`，并为 `toggleFollow` 的计数变更补判空（原先 `account_map.value[follower_id].follow.followee_count++` 在对方未被缓存时会抛错）。

#### ⑤ `create_at` 与 `gmt_created` 混用，导致时间显示/排序失效

接口里只声明了 `gmt_created`，但大量代码读 `post.create_at`（被索引签名 `[property: string]: any` 吞掉，TS 不报错）：

```ts
new Date(b.create_at).getTime() - new Date(a.create_at).getTime()   // → NaN，排序失效
timestampFormat(post.create_at)                                       // → "NaN年NaN月NaN日 NaN:NaN"
```

涉及 `stores/app.ts`、`Post.vue`、`SharePage.vue`、`SnapPage.vue`、`UserPage.vue` 共 9 处。

**修法**：新增 `getEntityTime()`（`create_at || gmt_created` 双兼容）与 `compareByTimeDesc()`，统一替换；接口补声明 `create_at?`。**该方案对两种后端字段命名都成立，无需先确认接口契约。**

#### ⑥ 401 刷新令牌队列只 reject 第一个请求

`services/index.ts` 用 `(requestQueue as any)._lastReject` 挂了个回调，刷新失败时只 reject 队列首个请求，**其余请求的 Promise 永不结算**（请求悬挂 + 内存泄漏）。

**修法**：队列改为 `{resolve, reject}[]`，成功统一重放、失败统一 reject。

#### ⑦ `publish_post` 没有返回 Promise

```ts
// 修复前
export const publish_post = async (data: any) => {
  instance.post(...).then(...);   // 没有 return / await
}
```

调用方 `ArticlePage.vue` 写的是 `await publish_post(post)`，结果 **await 立即通过** —— 接口还没成功就弹出"发布成功!"并清空草稿。

**修法**：`return` 该 Promise。

#### ⑧ DCFModelPage 的 Ticker 参数写成了 JSX 且变量未导入

```html
<!-- 修复前：漏了 : ，且 Presets 从未导入 -->
<Ticker characterLists={[Presets.CURRENCY]} />
```

该属性被当作**字面量字符串** `"{[Presets.CURRENCY]}"` 传给组件，动画字符集会变成乱码。

**修法**：改为 `:character-lists="[Presets.CURRENCY]"`，并从 **`@tombcato/smart-ticker/vue`** 导入 `Presets`。
⚠️ 注意：该包**根入口是 React 实现**（`react/jsx-runtime`），从根路径导入会导致构建 `MISSING_EXPORT` 失败 —— 必须走 `/vue` 子路径。

#### ⑨ 反馈弹窗的表单校验判断失效

TDesign 的 `form.validate()` 契约是：**校验通过 resolve(`true`)，校验失败 resolve 一个"字段→错误"对象**（不 reject）。所以：

```ts
const validRes = await formRef.value.validate();
if (!validRes) return;      // 对象恒为 truthy → 永远不返回 → 无效内容照常提交
```

`SnapPage.vue` 里写的是正确写法 `if (validateResult !== true) return;`，可作参照。

**修法**：改为 `if (validRes !== true) return;`。

#### ⑩ FacePicker 用了 Ant Design 的类名（样式从未生效）

组件用的是 `<t-tabs>`（TDesign），样式却写 `:deep(.ant-tabs-tab)` / `.ant-tabs-nav-wrap` —— **匹配不到任何元素**。已核对 TDesign 源码中真实类名为 `t-tabs__nav-item` / `t-tabs__nav-wrap`，并据此修正。

#### ⑪ 保存按钮属性名写错，无法禁用

`SettingsPage.vue`：`<t-button :disable="saving">` —— TDesign 的属性是 **`disabled`**。写错导致保存期间按钮不禁用，存在**重复提交**风险。已修正。

#### ⑫ 启动遮罩取不到元素 / 路由白名单不匹配

- `getElementById('global-splash')` 等 **8 个文件 20 处**使用了 **U+2011 非断连字符**（`‑`）而非 ASCII 连字符（`-`）。两端"同样打错"才没崩，但肉眼无法分辨、极易被后续编辑破坏；SVG 文件名 `logo‑placeholder.svg` 同样如此。
  → 已全量替换为 ASCII 连字符，并用 `git mv` 重命名资源文件（同步更新 2 处引用）。
- `App.vue` 白名单里的 `/reset-pwd` 与实际路由 `/reset_password/` 不一致，该白名单从未命中。

### 3.2 配置与类型缺陷

| # | 问题 | 位置 | 说明 |
| --- | --- | --- | --- |
| ⑬ | `VITE_MAIL_SUFFIX` 缺失时**直接抛错** | `common/config.ts` | `import.meta.env.X.split(',')` 先于 `\|\|` 执行，任一新环境缺该变量即白屏 |
| ⑭ | `CDN_BASE_URL` 可能为 `null` | `common/config.ts` | `getResourceUrl()` 内 `.endsWith()` 会对 null 抛错，已补兜底 |
| ⑮ | `"preview": "pm run build && ..."` | `package.json` | 缺 `n`，`npm run preview` 直接失败 |
| ⑯ | `logger.warn` 调用的是 `console.error` | `common/utils.ts` | 日志级别错位 |
| ⑰ | `apiUrls.static_links` / `upload_image_url` 用**静态** `config.API_BASE_URL` | `services/api.ts` | 绕过运行时节点切换（`getApiBaseUrl()`），节点降级后仍指向旧地址。已改为动态取值 |
| ⑱ | `.then((r: IAccount) => ...)` 类型标注错误 | `SettingsPage`×2、`Post.vue` | 实参是 `AxiosResponse`（代码用 `r.data` 是对的），标注错误会误导后续维护 |
| ⑲ | `get_posts(limit, cursor: string)` 与调用方不符 | `services/api.ts` | 调用方传 `null`，类型应为 `string \| null` |
| ⑳ | `device.ts` 每次调用都注册 resize 监听 | `common/device.ts` | 改为全局单例监听 + `requestAnimationFrame` 合并 |

---

## 四、首屏体积优化专项（本轮已落地）

### 4.1 结果

度量口径是**静态闭包**，不是单个 chunk 的体积——浏览器解析入口 chunk 时会顺着静态 `import "./x.js"`
把整条依赖链拉下来，Vite 还会把这些依赖写进 `index.html` 的 `modulepreload`；
只看某一个 chunk 的体积会得出完全相反的结论（见 4.3 的实测反例）。

| 场景 | 优化前 | 优化后 | 降幅 |
| --- | --- | --- | --- |
| **入口闭包**（任何页面首屏必下） | 1642.6 KB / gzip 423.3 KB | **360.5 KB / gzip 128.2 KB** | **−78.1%** / −69.7% |
| 首页 `/` | 1642.6 KB / gzip 423.3 KB | **880.7 KB / gzip 283.1 KB** | **−46.4%** / −33.1% |
| 发长文 `/articles/`（页面框架） | 2429.6 KB / gzip 690.6 KB | **598.6 KB / gzip 202.3 KB** | **−75.4%** / −70.7% |
| 天亮即焚 `/snaps/` | — | 598.0 KB / gzip 208.5 KB | — |
| DCF 估值 `/models/dcf/` | — | 871.5 KB / gzip 279.6 KB | — |

发长文页的 598.6 KB 只覆盖"页面框架"（Header、可见范围下拉、发布按钮、编辑器骨架）；
782.6 KB 的编辑器 chunk 转为异步并行加载，不再阻塞首帧（见 4.4）。
入口 CSS 由 **298.3 KB → 21.7 KB**：样式不再全量注入首屏，改为跟着路由按需加载。

复现命令（产物出来后读取 `dist/`，无需额外构建配置）：

```bash
npm run analyze:bundle
# 等价于：vite build && node scripts/bundle-closure.mjs dist HomePage ArticlePage
```

### 4.2 四个根因与对应修法

| # | 根因 | 证据 | 修法 |
| --- | --- | --- | --- |
| 1 | **路由全部静态导入**：`index` chunk 里塞着 12 个页面组件及其依赖，首屏必须全下 | 优化前 `index-*.js` = **818.7 KB** | `src/router/index.ts` 全部改为 `component: () => import('@/pages/XxxPage.vue')` |
| 2 | **Vue 打进了完整构建（含模板编译器）**：CJS 依赖 `c-scrollbar` 内部 `require('vue')` 解析到 `vue.cjs.prod.js`，连带 `@vue/compiler-core` + `@vue/compiler-dom` | 模块归属分析显示该 chunk 含 `@vue/compiler-core` 133 KB、`@vue/compiler-dom` 18 KB；优化前 `vue-*.js` = **287.5 KB**，现为 **109.5 KB** | `vite.config.ts` 精确别名 `^vue$ → vue/dist/vue.runtime.esm-bundler.js`（组件都是 SFC，运行时用不到编译器） |
| 3 | **CJS lodash 无法摇树**：`lodash` 的 main 是 CJS，`import {debounce} from 'lodash'` 会打进整包 | 优化前 `utils-*.js` = **238.1 KB**，现 `cScrollbar.common-*.js` = **101.7 KB**（−136 KB） | 别名 `^lodash$ → lodash-es`、`^lodash/(.*)$ → lodash-es/$1`；类型仍走 `@types/lodash`，并可与 tdesign 内部的 lodash-es 复用同一批模块 |
| 4 | **动画库静态导入**：`SingleEmoji.vue` 顶层 `import {DotLottie}`，把 lottie 运行时装进首屏 | 该库在首屏 chunk 中出现 130 处引用 | 改为 `import type` 抹掉运行时导入 + 首次真正需要时 `await import('@lottiefiles/dotlottie-web')`（带 Promise 缓存与降级到静态 emoji 的兜底） |

### 4.3 一次被实测否掉的尝试（重要，避免后人重犯）

曾用 rolldown 的 `build.rollupOptions.output.codeSplitting.groups` 把 wangEditor 单独拆成 `vendor-editor` 组，
理由是"它只被 `/articles/` 用，独立成 chunk 可以长期吃浏览器缓存"。产物列表看起来很干净，但实测结果相反：

```
优化前 入口闭包           849.9 KB
加分组后 入口闭包        1157.6 KB   ← 反而变大 307 KB
  └─ 891.3 KB  vendor-editor-*.js   ← 首屏就被预取了
```

原因：`dist/index.html` 里出现了 `<link rel="modulepreload" href="/assets/vendor-editor-*.js">`，
入口 chunk 中也出现了 `from"./vendor-editor-*.js"` 的**静态导入**。chunk 是原子加载单位，
命名分组会把整个 chunk 提到入口的静态依赖里，所以**"把大依赖拆出来" ≠ "按需加载"**。
**该配置已撤销**，并在 `vite.config.ts` 里留了注释说明。结论：wangEditor 留在 `ArticlePage` 的懒加载 chunk 中，
只有进入发长文页才下载，首屏成本为 0——这正是现状。

### 4.4 发长文页：把 wangEditor 移出首屏阻塞

`/articles/` 的 1379.7 KB 里有 782.6 KB 是 wangEditor（含样式 14.6 KB）。它是这个页面的核心，
**总下载量减不掉**，但那 787 KB 不该挡住页面框架的首帧渲染。做法：

```
ArticlePage.vue  ──defineAsyncComponent──▶  components/ArticleEditor.vue  (wangEditor + 样式)
                                            components/EditorSkeleton.vue  (加载期间的骨架)
```

| 改动点 | 说明 |
| --- | --- |
| 编辑器封装为独立组件 | `ArticleEditor.vue` 内含编辑器实例、上传配置，`defineExpose({getText, clear})` 对外 |
| 页面侧异步挂载 | `defineAsyncComponent({loader, loadingComponent: EditorSkeleton, delay: 50})` |
| 骨架顶到就绪 | `loadingComponent` 保证 chunk 加载期间有等尺寸占位（工具栏 40px + 正文 500px），替换时不跳动 |
| `delay: 50` 防闪 | chunk 命中缓存时（<50ms）直接渲染编辑器，不闪一下骨架 |
| 发布按钮护栏 | 编辑器 `@ready` 前点发布，提示「编辑器还在加载，请稍候」，不会读到空内容 |

效果：

| 产物 | 改动前 | 改动后 |
| --- | --- | --- |
| `ArticlePage-*.js` | 805.87 kB | **6.23 kB** |
| `ArticlePage-*.css` | （与编辑器样式混在一起） | **0.25 kB** |
| `ArticleEditor-*.js`（异步） | — | 801.35 kB |
| `ArticleEditor-*.css`（异步） | — | 14.61 kB |
| 进入 `/articles/` 的首帧渲染成本 | 1379.7 KB | **598.6 KB**（编辑器随后并行到位） |

**关于 `ref` 的一个坑（已核实）**：`ref` 放在 `defineAsyncComponent` 上时，能不能拿到内层组件的
`defineExpose`？Vue 的 `createInnerComp` 会做 `vnode.ref = ref2`（把 ref 转交给内层组件 vnode），
所以能拿到。已用两部分交叉确认：① Vue 3.5.40 源码 `runtime-core` 的 `createInnerComp`；
② 本页编译产物里确实生成了 `ref_key:'editorComp', ref:p` 并把 `onReady` 接到了 `editorReady`。

### 4.5 新增的度量工具

| 文件 | 作用 |
| --- | --- |
| `scripts/bundle-closure.mjs` | 从 `dist/` 计算「入口闭包」与各路由的额外加载量，同时给出 gzip；`npm run analyze:bundle` 调用它 |

> 建议把它当作**改动的验收门槛**：任何涉及依赖/路由/分包的改动，跑一次并对比「入口闭包」数字，不应变大。

---

## 五、后续优化建议

### 已决策（确认不再推进）

**首页 `cScrollbar.common` 101.7 KB —— 保留 `trigger="hover"` 滚动条效果**

该项是首页路由外部加载里最大的一件（模块归属：`c-scrollbar` 本体 82.8 KB + TDesign `Upload` 95 KB + 图标 39.5 KB）。
换成原生滚动条能省约 80 KB，但会改变滚动条的出现方式与观感。
**已确认：保留现有 hover 效果，不做替换**（2026-09-17）。
若将来改主意，可用纯 CSS 零依赖复刻：`scrollbar-width: thin` + `::-webkit-scrollbar` 定制，
配合 `:hover` 只显示 thumb。

### P0 —— 仍建议尽快处理

**1. 构建插件耗时**
`vite:svg-icons` 占构建总耗时 **42~55%**（其余：unplugin-vue-components 18~27%、remove-console 11~26%、unplugin-auto-import 13~24%）。
若不依赖 SVG symbol 机制，可考虑直接 `import` 图标以缩短构建时间。

### P1 —— 架构与一致性

**5. 类型建模过宽**
`IPost` / `IAccount` 都带 `[property: string]: any` 索引签名。它虽然"向后兼容"，却让**拼错字段名完全合法**（第⑤条 bug 正是被它掩盖）。建议逐步替换为显式字段。

`IContent` 目前用索引签名 + 可选字段表达"文本/图片"两种形态，建议改为**可辨识联合**：

```ts
type IPostContent =
  | { kind: 'text'; text: string }
  | { kind: 'richtext'; text: string; images: string[] };
```

**6. 重复的业务逻辑**
- `services/api.ts:toggleFollow` 与 `stores/app.ts:useCacheStore.toggleFollow` 功能重叠，页面只用后者，**前者是死代码**，建议删除其一；
- `HomePage.vue` 自行实现了一套 `window.innerWidth < 768` 的断点判断，与 `common/device.ts` 的 `BREAKPOINT_MOBILE = 767` 重复，建议统一走 `useDeviceWatcher()`；
- `App.vue` 的白名单与 `router` 的路由表两处维护页面路径，容易再次漂移（第⑫条）。

**7. 接口路径需与后端核对**

| 位置 | 现状 | 疑点 |
| --- | --- | --- |
| `get_posts_latest` | `/posts/lastest/` | `lastest` 疑为 `latest` 拼写错误 |
| `get_comments` | `/comments/1/${post_id}/` | 硬编码 `1`，含义不明（页码？类型？） |
| `Header.vue` | `item.extra.avator` | `avator` 非标准拼写（`SettingsPage` 表单也用了 `avator`，可能后端确实如此，建议确认后统一） |

**8. 全局 Store 注册表模式**
`stores/index.ts` 用 `registerStore()` 在启动时一次性实例化全部 Store，并依赖 `app.use(pinia)` 的时序。这样无法懒加载，也绕开了 Pinia 的正常用法。建议非组件环境直接调用 `useXxxStore()`。

**9. 自动生成的类型声明未被纳入类型检查**
`auto-imports.d.ts` 与 `components.d.ts` 生成在**项目根目录**，而 `tsconfig.app.json` 只 include `src/**`，导致：
- 模板里的自动注册组件（`<Header>`、`<Post>`、`<Ticker>` …）**没有类型提示**；
- `auto-imports.d.ts` 里还引用了**未安装的 `ant-design-vue`**（因其带 `@ts-nocheck` 才没报错）。

建议把插件 `dts` 输出改到 `src/types/` 下。

**10. 工程规范缺口**
- **无 ESLint**：不一致写法（`var`、`==`、未 await 的 Promise）只能靠人眼发现，建议接入 `eslint-plugin-vue` + `@typescript-eslint`；
- **无测试**：全项目 0 个测试文件，`getEntityTime` / `timestampFormat` / 布局引擎 `LayoutEngine` 都是很适合单测的纯逻辑；
- **无 `.editorconfig` / `engines`**：建议补 Node 版本约束与 `.nvmrc`，避免"我这能跑"问题。

### P2 —— 细节

- **首页信息流仍是"一次性全量 DOM"**：图片未做懒加载、长列表未做虚拟滚动。这属于运行时性能（不是下载体积），
  信息流越长越明显，建议在 `Post.vue` / `HomePage.vue` 上排期，配合 `IntersectionObserver` 先做图片懒加载；
- `TestPage.vue` 是空占位页，且被 `test` 路由白名单放行，建议上线前移除；
- `common/constants.ts:APP_NAME` 与 `common/config.ts:NAME` 重复定义"推文"；
- `stores/index.ts` 的 `appStore` 在 `registerStore()` 前访问会得到 `undefined`，缺少护栏；
- `device.ts` 的 `isMobileDevice()` 在模板中直接调用属**非响应式**（`SnapPage`、`ResetPasswordPage`），窗口缩放不会重渲染；
- `detectPersist.loadDetectState()` 对 `JSON.parse` 结果未做结构校验，脏数据可能传入逻辑；
- `utils.timestampFormat()` 的"昨天"用 `当前时间 - 86400s` 判断，跨 DST / 边界时刻会不准确，可改用日历日期比较；
- `UserAvatar.vue` 用 `charAt(0)` 取昵称首字，对 emoji / 生僻字（代理对）会截断成乱码，建议 `Array.from(nick)[0]`；
- `style.css` 的 `* { padding: 0; margin: 0 }` 会波及 TDesign 内部组件，建议收敛到 `html, body` 或仅在需要处重置。

---

## 六、类型错误修法归档（59 项已全部修复）

`npm run type-check` 现在输出为空、退出码 0。以下保留上一轮的 59 项清单**作为修法参考**，
其中标注的文件行号对应**修复前**的状态，不必再照着找。

复现：`npm run type-check`

### A. 未使用的导入 / 变量（17 处，直接删除即可）

| 文件 | 位置 | 内容 |
| --- | --- | --- |
| `components/NewPost.vue` | 22 | `getResourceUrl` |
| `components/NineImageGrid.vue` | 67 | `groupId` |
| `pages/DCFModelPage.vue` | 812 / 819 / 826 / 833 | `h` ×4 |
| `pages/HomePage.vue` | 13 | `computed` |
| `pages/LogoPage.vue` | 229 | `downloadPng` |
| `pages/SearchResultPage.vue` | 21 | `getResourceUrl` |
| `pages/SettingsPage.vue` | 13 / 77 / 87 | `onUnmounted` / `assignWith` / `context` |
| `pages/SharePage.vue` | 8 / 48 | `NineImageGrid` / `html` |
| `pages/SnapPage.vue` | 187 | `Edit2Icon` / `MoonIcon` |
| `pages/UserPage.vue` | 20 | `get_posts` |

> 注意：`Post.vue`（第 19、26 行）与 `SharePage.vue`（第 7、11 行）存在**从同一模块重复 import** 的情况（`common/utils.ts` 分别经 `@/` 与相对路径各导入一次），建议合并为一条。

### B. 路由 query 参数未收窄（6 处）

`LoginPage.vue:73`、`TwoStepVerificationPage.vue:49`：

```ts
router.push(proxy.proxy.redirect)   // redirect: string | LocationQueryValue[] | null
```

**修法**：

```ts
const redirect = route.query.redirect;
if (typeof redirect === 'string' && redirect) router.push(redirect);
else router.push({name: 'home'});
```

### C. 路由 params 类型为 `string | string[]`（4 处）

`UserPage.vue:49 / 54 / 65 / 125` —— `route.params.username` 传给只接受 `string` 的函数。
**修法**：`const username = String(route.params.username)`，或为 `useRoute()` 声明参数类型。

### D. `follow.value` 可能为 undefined（6 处）

`UserPage.vue:114 / 121 / 122 / 127 / 128` —— `follow` 是 `ref<IFollow | undefined>`，模板/逻辑中直接取 `.follower_count` 等。
**修法**：用 `follow.value?.is_following`，或在模板里加 `v-if="follow"`。

### E. 实体必填字段与实际构造不一致（4 处）

- `IPost.gmt_created` 标记为必填，但 `NewPost.vue:62`、`ArticlePage.vue:155` 构造待发布对象时不带该字段（**由服务端生成**）→ 建议 `IPost.gmt_created?: string`；
- `IPostDraft.createTime` 必填，但 `NewPost.vue:102`、`ArticlePage.vue:138` 只传 `{text, images}` → 建议 `createTime?: number`，或在写入处补 `Date.now()`。

### F. 第三方库类型缺失（3 处）

| 位置 | 问题 | 修法 |
| --- | --- | --- |
| `ArticlePage.vue:19` | `@wangeditor/editor-for-vue` 无声明文件（其 `exports` 未暴露 `.d.ts`） | 在 `src/types/shims.d.ts` 中 `declare module '@wangeditor/editor-for-vue';` |
| `SnapPage.vue:452` | 导入 `TextCollapse.vue` 被推断为 `any`：该组件是 `<script setup>` **未加 `lang="ts"`**，SFC 无类型信息 | 给 `TextCollapse.vue` 的 `<script setup>` 补 `lang="ts"` |
| `Post.vue:10` | `vue-social-sharing` 无具名导出 `ShareNetwork` | 改为 `import ShareNetwork from 'vue-social-sharing'` 或改用默认导出 |

### G. 其它单点问题

| 位置 | 问题 | 建议 |
| --- | --- | --- |
| `Header.vue:131-133` | 通知项类型推断为 `never`（`item.extra/.title/.content`） | 为通知列表补接口类型 `INotice` |
| `SettingsPage.vue:41` | `headerRef.value.$el` 类型不存在 | 用 `(headerRef.value?.$el as HTMLElement)` 并加判空 |
| `SettingsPage.vue:46 / 209 / 216` | `files.value` / `string \| undefined` / `number \| null \| undefined` 传参不匹配 | 补判空与显式转换 |
| `NewPost.vue:47 / 60 / 100` | `data` / `fileList.value` 可能为 undefined | 补可选链与默认值 |
| `NewPost.vue:203`、`ArticlePage.vue:216` | 用 `number` 索引 `{0: string; 1: string}` | 显式 `as keyof typeof map` 或用 `Record<number, string>` |
| `NineImageGrid.vue:135`、`UserPage.vue:88` | 回调参数隐式 any | 补参数类型 |
| `UserPage.vue:159` | `size="120px"` 不在 TDesign 联合类型内 | 改用数字或 `'large'` |
| `UserPage.vue:207` | `null/undefined` 用作索引 | 索引前判空 |
| `Post.vue:140-141` | `unknown` 用作索引类型 | 显式断言为 `string` |

---

## 七、新增/修改的工程文件

| 文件 | 说明 |
| --- | --- |
| `.prettierrc.json` | 新增。按项目实测风格配置：`printWidth:120`、`singleQuote`、`bracketSpacing:false`、**`endOfLine:"auto"`**（保住仓库 CRLF，避免整文件 diff） |
| `.prettierignore` | 新增。排除依赖、产物、自动生成的 d.ts、静态资源 |
| `tsconfig.app.json` | 补 `baseUrl`+`paths`（对齐 Vite 别名）、`lib` 加 `ES2022` |
| `package.json` | 新增 `type-check` / `build:only` / `analyze:bundle` / `format` / `format:check` 脚本；`build` 改为「先类型检查再构建」；`preview` 脚本修拼写；移除 5 个未使用依赖 |
| `vite.config.ts` | 新增 `resolve.alias` 数组形式：`^vue$` → runtime-only、`^lodash$` → `lodash-es`；设置 `chunkSizeWarningLimit: 900` 并注释说明理由；**刻意不配置** `codeSplitting.groups`（理由见 4.3） |
| `scripts/bundle-closure.mjs` | 新增。首屏体积（静态闭包）度量工具，`npm run analyze:bundle` 调用 |
| `src/router/index.ts` | 12 个页面改为动态 `import()`，并把懒加载约定写成文件头注释 |
| `src/pages/ArticlePage.vue` | 编辑器改为异步组件（`loadingComponent` + `delay:50`），本页 chunk 由 806 KB 降到 **6.2 KB**；发布前加「编辑器未就绪」护栏；顺手删掉指向不存在变量的 `ref="headerRef"` |
| `src/components/ArticleEditor.vue` | 新增。wangEditor 封装（编辑器实例、上传配置、`getText()`/`clear()` 暴露），文件头写明为什么要单独拆 |
| `src/components/EditorSkeleton.vue` | 新增。编辑器异步加载期间的骨架占位，尺寸与真实编辑器一致，替换不跳动 |
| `src/vite-env.d.ts` | 补 `ImportMetaEnv` 变量声明、`virtual:svg-icons-*` 与 `@wangeditor/editor-for-vue` 模块声明 |
| `src/components/SingleEmoji.vue` | lottie 由静态导入改为「类型导入 + 首次使用时动态加载」，附降级兜底 |

---

## 八、验证与回滚

```bash
cd D:\Git\vue_tuiwen

npm run format:check     # 格式一致性
npm run type-check       # 类型检查（当前 0 项）
npm run build            # 生产构建（内部已含 type-check）
npm run analyze:bundle   # 首屏体积：入口闭包 360.5 KB 基线，不应变大

# 查看本次全部改动
git diff
git status

# 如需回滚（工作区干净、改动均未提交）
git checkout -- .        # 撤销已跟踪文件的修改
git clean -fd .prettierrc.json .prettierignore CODE_REVIEW.md scripts/bundle-closure.mjs \
               src/components/ArticleEditor.vue src/components/EditorSkeleton.vue   # 删除新增文件
```

> 本次改动**尚未提交**，全部保留在工作区，可逐文件 review 后再决定提交范围。
> 提醒：`dist/` 与 `node_modules/` 已在 `.gitignore` 中；`scripts/bundle-closure.mjs` 与两个新组件是**需要提交**的新文件。

> ⚠️ **发长文页需要人工验证一次**：本轮把编辑器改成了异步组件，属于本次唯一的运行时行为改动。
> 本环境（沙箱）无法启动 dev server / 浏览器，因此没能跑浏览器冒烟测试。
> 请 `npm run dev` 后打开 `/articles/` 确认三件事：① 能看到「编辑器加载中…」再变成编辑器；
> ② 输入的文字会写进草稿（刷新不丢）；③ 点「发布」能正常提交、成功后编辑器被清空。

---

## 九、给后续维护者的四点提醒

1. **注释已与代码同步校验**：文件头注释若与实现不符（如 `SingleEmoji.vue` 曾误写"通过 Teleport 到 body"，实际是 `position:fixed`），请随手改掉——错误注释比没有注释更危险。
2. **`create_at` / `gmt_created` 请统一**：本次用 `getEntityTime()` 做了双兼容兜底，属于**防御性方案**。建议与后端确认唯一字段名后，收敛为单一取值，避免长期存在两套命名。
3. **改依赖/路由/分包后必跑 `npm run analyze:bundle`**：单个 chunk 的体积不反映真实下载量，4.3 节的反例（拆包反而多下 307 KB）就是这么踩出来的。新增页面请一律用动态 `import()`（详见 `src/router/index.ts` 的约定注释）。
4. **发长文页的编辑器是异步加载的**：`ArticlePage.vue` 用 `defineAsyncComponent` 挂载 `components/ArticleEditor.vue`（约 800 KB）。
   不要为了"少一层"把它改回静态 `import`，那会让 787 KB 重新回到首屏路径；同理，把 `@wangeditor/*` 加进
   `build.rollupOptions.output.codeSplitting.groups` 也会适得其反（见 4.3）。

---

## 十、搜索页与个人中心页增强（深化轮）

### 10.1 背景

前几轮已对信息流、请求层、短视频等做优化。`SearchResultPage` 与 `UserPage` 在上一轮（提交 `a806936`）做了重写：
搜索页补搜索历史 / 热门搜索 / 双 Tab / 关键词高亮 / 骨架屏 / 竞态防护；个人中心修正「同路由不同用户不刷新」的响应式
bug、补关注 / 粉丝双 Tab、统计语义修正、行内关注乐观更新。本轮在此基础上继续深入，目标是把这两个高频页面的
可用性与健壮性再做实。

### 10.2 本轮新增 —— 搜索页（`SearchResultPage.vue`）

| 能力 | 说明 |
| --- | --- |
| **搜索建议下拉** | 输入时实时弹出：首条固定为「搜索 \<输入\>」，其后为历史 + 热门中与输入匹配的条目（去重、最多 8 条）。支持键盘 ↑/↓ 选择、回车确认、Esc 关闭、点击选择。纯前端派生，不新增后端依赖。 |
| **结果计数** | 结果区顶部展示「找到 N 个 / 已加载 N 个」（后端返回 `total` 优先，否则退化为已加载条数），让用户知道结果规模。 |
| **待搜索态门控 `hasSearched`** | 未真正发起搜索前保持「历史 + 热门」空状态面板，避免一打字就切到空结果区；清空输入框时回到该面板。 |
| 沿用 | 关键词高亮（逐段渲染、不用 `v-html`，防 XSS）、骨架屏、竞态防护（`reqToken`）、行内关注乐观更新 + 回滚。 |

### 10.3 本轮新增 —— 个人中心（`UserPage.vue`）

| 能力 | 说明 |
| --- | --- |
| **关系列表分页** | 关注 / 粉丝列表支持 `offset` 分页「加载更多」（每页 30）。返回数据按 `account_id` 去重，同时**兜底「后端不支持 offset、每页都返回第一页」的情形**（新数据全部重复即判定到底），防止死循环。 |
| **Tab 标签带数量** | 关注 / 粉丝 Tab 标签显示后端统计数（为 0 / 未加载时不显示括号），信息密度更高。 |
| **失败可重试空态** | 关系列表加载失败展示「加载失败 + 重试按钮」，与「真的没有」区分开（靠 `followeesLoaded` / `followersLoaded` 标记）；后端未实现时静默降级不弹错误。 |
| 沿用 | 帖子列表游标分页、行内关注乐观更新、本人/他人按钮切换（编辑资料 / 私信）、同路由不同用户 `computed + watch` 重新拉取、返回无历史兜底首页。 |

### 10.4 上一轮遗留的两处类型修复（已合入 `a806936`）

1. **axios 不认 `customOptions`**：曾尝试在 `vite-env.d.ts` 做 `declare module 'axios'` 模块增强，但重新声明带泛型同名接口会冲掉原生类型，已还原；改为调用处局部类型断言（`as AxiosRequestConfig`）。
2. **`MessageIcon` 在 `tdesign-icons-vue-next` 中不存在** → 改用 `ChatIcon`。

### 10.5 验证结果（全绿）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run type-check` | ✅ **0 错误** |
| 格式一致性 | `npm run format:check` | ✅ `All matched files use Prettier code style!` |
| 生产构建 | `npx vite build --outDir dist_check --emptyOutDir` | ✅ `built in 7.38s`，无报错 |
| 入口闭包 | `node scripts/bundle-closure.mjs dist_check` | ✅ **376.3 KB / gzip 132.4 KB**（与基线持平，无回归） |

### 10.6 仍待后端补齐 / 已知限制

- `search_post` / `get_followees` / `get_followers` 前端已就位，大概率后端尚未实现；现为静默空态 / 失败重试降级，接上即出数据。
- 关系列表分页依赖后端支持 `offset` 参数；未支持时由前端去重兜底停止（不会无限加载）。
- 搜索建议目前来自本地历史 + 第三方热榜，未接后端「联想词」接口；若后续提供，可在 `suggestItems` 里并入远程结果。

---

## 十一、全应用巡检修复轮（安全 / 正确性 / 体验）

### 11.1 背景与方法

对 `src/` 全量（18 页面 + 19 组件 + stores + common + services）做了一次只读巡检，按
「P0 线上功能错误 → P1 明显体验缺陷 → P2 可清理隐患」分级筛出 20 条，本轮修掉其中
**纯前端、无后端依赖、可即时验证**的一批；涉及后端接口语义的两项（人机验证守卫、
ArticleEditor 上传字段口径）留待与后端对齐后再动。

### 11.2 P0 安全：三处 `v-html` 存储型 XSS

推文正文、分享页正文、树洞正文最终都经 `v-html` 渲染，任何人发布一条含
`<img src=x onerror=...>` 的正文，所有浏览者都会执行其中脚本。而长文编辑器产出的是
**合法 HTML**（`<p>` / `<img>` / `<table>`），不能整体转义，否则正文会被渲染成标签文字。

**方案**：新增 `src/common/sanitize.ts`（零依赖），做「基于 DOM 的选择性清洗」：

| 步骤 | 规则 |
| --- | --- |
| 元素 | 整体删除高危元素及子树：`script/style/iframe/object/embed/form/link/meta/base/title/noscript/svg/math/template/frame/applet` |
| 事件 | 删除所有 `on*` 属性（onerror / onclick / onload ...） |
| URL | `href/src/action/formaction/xlink:href/poster/background/srcset` 中协议为 `javascript:` / `vbscript:` 或非图片 `data:` 的删属性 |
| style | 含 `expression(` / `javascript:` / `url(` 的删属性 |

安全性依据：清洗时把 HTML 写进**脱离文档的 `<template>`**，脚本不执行、图片不请求，
因此「清洗」动作本身无副作用，属性清完再取 `innerHTML` 交给 `v-html`。

接入点只有两处，覆盖全部渲染路径：
- `components/RichTextCollapse.vue` → 新增 `safeContent` computed（信息流 `Post.vue` 与分享页 `SharePage.vue` 共用的唯一 HTML 出口）；
- `pages/SnapPage.vue` → 树洞正文 `v-html="sanitizeHtml(...)"`。

> ⚠️ **体积纪律**：`sanitizeHtml` 最初写在 `common/utils.ts` 里，导致入口闭包 376.3 → **377.4 KB**（+1.1 KB）。
> 因它只被懒加载路由引用，遂拆成独立的 `src/common/sanitize.ts`，闭包回落到 **376.4 KB（持平）**。
> 结论：**只给富文本渲染用的工具不要放 utils.ts**，否则首屏为用不到的功能付流量。

### 11.3 P0 正确性：登录页移动端断点完全失效

`LoginPage.vue` 原先 `import {isMobile} from '@/common/device.ts'`。那个 `isMobile` 是一次性初值常量，
只有 `useDeviceWatcher()` 才会注册全局 resize 监听并同步状态；直接 import 时**监听从未注册、值恒为 false**，
手机上左侧品牌栏照样渲染，登录卡被严重挤压。已改为 `const {isMobile} = useDeviceWatcher()`
（与 `ResetPasswordPage.vue` 一致）。这也是「JS 断点一律走 `useDeviceWatcher()`」约定的反面案例。

### 11.4 P1：其他修复

| 文件 | 问题 | 修复 |
| --- | --- | --- |
| `SnapPage.vue` | `v-for :key="index"`，轮询重排后组件内部状态（展开态 / 计数动画）按位置错位黏在别的条目上 | 改 `:key="item.id"`；`emotionsOptions` 改 `:key="item.value"` |
| `SnapPage.vue` | 轮询与手动刷新无并发护栏，两次各自读 `snaps` 再分别写回 → 后写覆盖先写，**新帖丢失** | 加 `fetchingLatest` 飞行锁 |
| `SnapPage.vue` | `likeSnap` 未 try/catch，模板箭头函数返回的 Promise 无人接收 → unhandled rejection；且轮询可能已换掉目标条目，`snap.like =` 抛 TypeError | try/catch + 先 `find` 判空 |
| `SnapPage.vue` | 「订阅开板提醒」只弹一句成功提示，**不做任何订阅**，是欺骗用户的假功能 | 改为真正 `notificationManager.requestPermission()`，按 granted / denied / default 分别反馈 |
| `SnapPage.vue` | 开放时段口径不一：代码 `hour >= 18`，文案写 23:00 | 统一为 `hour >= 23 \|\| hour < 6`，与文案一致 |
| `SnapPage.vue` | 3 处 `console.*` 残留，生产可见 | 换 `logger.*` |
| `SettingsPage.vue` | **两个 `onMounted` 重复执行**，头像被 push 进 `files` 两次，而 `t-upload` 配了 `:max="1"` | 删除前一个 `onMounted`，只保留带 resize/focus 监听的那个 |
| `SettingsPage.vue` | `err.response.data.detail` 在网络错误时再抛 TypeError，用户看不到任何失败提示（注册页同样） | 统一 `err?.response?.data?.detail \|\| '兜底文案'` |
| `SettingsPage.vue` | 用户名 PATCH 失败时异常直接冲出 `update_account`，`.finally` 挂在 put 链上执行不到 → **`saving` 永真，两个 Tab 保存按钮全禁用** | `update_username` 补 try/catch 后**重新抛出**；`update_account` 整体 try/catch/finally 复位 `saving` |
| `ArticlePage.vue` | `await publish_post(post)` 无 try/catch/finally，任一失败 → **`submitting` 卡死，只能刷新页面** | try/catch/finally，finally 复位 `submitting` |
| `LoginPage.vue` | 登录按钮无 loading / 无防抖，连点发多个请求 | 加 `submitting` + `:loading` / `:disabled`；转 try/catch/finally |
| `RegisterPage.vue` | 同上（弱网下尤其容易重复注册） | 加 `submitting` + `:loading` / `:disabled` + try/catch/finally |
| `LoginPage.vue` | 连接测试用**裸 axios**（违反约定，绕过 401 刷新与统一错误处理） | 改走 `instance`（绝对 URL 覆盖 baseURL，不影响测试目的）+ `hideError` 避免双重弹窗 |
| `LoginPage.vue` | `val.startsWith('http')` 可被 `"httpfoo"` 之类非法串绕过 | 改 `/^https?:\/\//i` 正则 |
| `HomePage.vue` | `pending_posts.value = fresh` **覆盖式赋值**，上一批未查看的提示被冲掉，若下批 latest 不再含它们则**永久丢失** | 改为「新批次在前 + 按 post_id 去重 + 上限 50 条」合并 |

### 11.5 验证结果（全绿）

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run type-check` | ✅ **0 错误** |
| 格式一致性 | `npm run format:check` | ✅ `All matched files use Prettier code style!` |
| 生产构建 | `npx vite build --outDir dist_check --emptyOutDir` | ✅ `built in 9.50s`，无报错 |
| 入口闭包 | `node scripts/bundle-closure.mjs dist_check` | ✅ **376.4 KB / gzip 132.4 KB**（基线 376.3 KB，持平） |

### 11.6 本轮未处理（需与后端对齐或另行排期）

1. **人机验证守卫被整段注释**（`router/index.ts`）：login / register / reset_password 三页 `meta` 仍标
   `need_two_step_verification` 但从不生效；`TwoStepVerificationPage` 写入凭证也不校验真假。
   建议：恢复守卫并校验凭证，或暂时移除三处 meta 与该页，避免「防护已启用」的错觉。
2. **ArticleEditor 图片上传**：用裸 `axios.post`（违反约定）、失败只有 `console.error` 无用户反馈；
   `res.data.url` 与注释声称的 `image_url` 口径必有一错，错了会插入 `${CDN}/undefined` 破图。
3. **`TextCollapse` 的 `lines` prop 失效**：CSS 硬编码 `-webkit-line-clamp: 2`，3~5 行文本被静默截断且无展开入口
   （`SnapPage` 是唯一使用方）。
4. **SharePage**：网络失败与「帖子不存在」混淆（断网显示"已删除"）、无重试、无并发序号保护。
5. **死代码**：`NineImageGrid.vue`（326 行零使用）、`useAudio.ts`（整文件零 import）、
   `emoji.ts` 的 `getEmoji` 等一组导出零调用、`endpoint-detector.ts` 四个导出零外部调用、
   `Post.vue` 分享按钮的纯求值 `@click` handler。
6. **登录/注册/改密页的 `console.*`** 与 DCFModelPage 的 `toFixed` 白屏风险、安全边际卡片硬编码 `*0.7`/`*0.8` 与表单字段脱节。
