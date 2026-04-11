# `rename:brand` 脚本说明

## 目的

这个脚本用于批量修改项目里的“面向用户展示的品牌文案”，帮助你把默认品牌名从当前值替换成新的品牌名，同时尽量避免误改代码标识符、仓库信息、自动化脚本和其他不应该被品牌替换影响的内容。

它适合下面这些场景：

- 基于当前项目做二次品牌定制
- 想快速把 UI、安装器文案、托盘文案、部分元信息里的品牌名统一替换掉
- 想做一次可控的品牌替换，而不是全仓库无差别 `find/replace`

它不适合下面这些场景：

- 想修改 npm 包名、应用内部代码标识符、TypeScript/JavaScript 函数名
- 想替换 GitHub 仓库名、CI 配置、Actions、脚本中的内部引用
- 想把所有出现过的旧品牌字符串做全量暴力替换

这个脚本的设计目标是：

- 只改“用户看得到的品牌文案”
- 不改“工程内部标识”
- 尽量降低误伤面

---

## 脚本位置

- `scripts/rename-brand.mjs`

在 `package.json` 中对应命令是：

- `pnpm rename:brand`

---

## 默认行为

脚本默认把：

- `ClawX`

替换成你传入的新品牌名。

默认来源品牌写死在脚本里：

```js
const DEFAULT_FROM = 'ClawX';
```

如果你的仓库已经不是从 `ClawX` 开始，而是从别的旧品牌名继续演化过来的，可以显式传 `--from`。

---

## 基本用法

### 1. 最常用

把默认品牌 `ClawX` 替换为新品牌：

```bash
pnpm rename:brand -- --to "BaseClaw"
```

也可以省略 `--to`，直接传位置参数：

```bash
pnpm rename:brand -- "BaseClaw"
```

### 2. 指定旧品牌和新品牌

如果当前仓库里你要替换的不是 `ClawX`，而是其他旧品牌名：

```bash
pnpm rename:brand -- --from "Old Brand" --to "New Brand"
```

### 3. 只预览，不落盘

先看脚本会改哪些文件：

```bash
pnpm rename:brand -- --from "ClawX" --to "BaseClaw" --dry-run
```

这是推荐第一步，尤其在你不确定当前仓库里旧品牌文案分布是否已经发生变化时。

### 4. 查看帮助

```bash
pnpm rename:brand -- --help
```

---

## 推荐使用流程

建议按下面顺序执行：

1. 先运行 dry-run
2. 查看将被修改的文件列表
3. 再执行正式替换
4. 用 `git diff` 检查结果
5. 按需要补改脚本未覆盖的品牌资源或图片素材
6. 跑一遍测试或至少启动应用做手动检查

一个安全的最小流程示例：

```bash
pnpm rename:brand -- --to "BaseClaw" --dry-run
pnpm rename:brand -- --to "BaseClaw"
git diff --stat
```

如果你希望更稳一点，可以再执行：

```bash
pnpm test
pnpm run build:vite
```

---

## 这个脚本会修改哪些内容

脚本只处理“受管控文件”。

受管控文件分两类：

### 1. 所有多语言 locale JSON

脚本会递归处理：

- `src/i18n/locales/**/*.json`

在这些 locale 文件里，它会把匹配到的旧品牌字符串全部替换掉。

这意味着像下面这种用户可见文本通常都会被改到：

- 页面标题
- 设置文案
- 错误提示
- 用户代理展示串
- 帮助文案

### 2. 一组手工白名单文件

脚本还会处理一批明确列出的文件，例如：

- `index.html`
- `package.json`
- `electron-builder.yml`
- `src/components/layout/Sidebar.tsx`
- `src/pages/Setup/index.tsx`
- `src/lib/gateway-client.ts`
- `src/lib/api-client.ts`
- `electron/gateway/process-launcher.ts`
- `electron/gateway/ws-client.ts`
- `electron/shared/providers/registry.ts`
- `electron/main/tray.ts`
- `electron/main/launch-at-startup.ts`
- `electron/utils/browser-oauth.ts`
- `electron/utils/gemini-cli-oauth.ts`
- `electron/utils/openrouter-headers-preload.cjs`

但注意，这些文件也不是整文件无脑替换，而是只替换脚本里定义过的特定行模式。

比如：

- `package.json` 只会改 `description` 和 `author`
- `electron-builder.yml` 只会改 `productName`、`shortcutName`、`description` 等展示字段
- 某些 `X-Title` header、托盘菜单文案、alt 文本、Setup 页 logo 文案会被替换

---

## 这个脚本明确不会修改什么

这是它最重要的边界之一。

### 1. 不会修改代码标识符

例如：

- 函数名
- 变量名
- 类型名
- 内部 store 名
- npm 包名

举例来说，`package.json` 里的：

```json
"name": "clawx"
```

不会被改。

### 2. 不会修改不在白名单中的源码文件

例如某个普通实现文件里就算出现了 `ClawX`，如果它不在脚本的 managed file 范围里，也不会被替换。

### 3. 不会修改 GitHub 仓库字段

测试里专门覆盖了这个边界：

- `electron-builder.yml` 中像 `publish.repo` 这样的 GitHub 仓库信息不会被替换

也就是说，它会改：

- `productName: ClawX`

但不会改：

- `repo: ClawX`

如果那个字段代表的是仓库名而不是 UI 品牌名。

### 4. 不会处理 GitHub Actions 和自动化脚本

脚本开头的用途说明已经明确写了这一点：

- 不触碰 code identifiers
- 不触碰 automation scripts
- 不触碰 GitHub Actions

---

## 参数说明

### `--to`

目标品牌名，必填。

示例：

```bash
pnpm rename:brand -- --to "BaseClaw"
```

### `--from`

来源品牌名，可选，默认是 `ClawX`。

示例：

```bash
pnpm rename:brand -- --from "NovaDesk" --to "BaseClaw"
```

### `--dry-run`

只输出将要修改的文件和替换数量，不写入文件。

示例：

```bash
pnpm rename:brand -- --to "BaseClaw" --dry-run
```

### `--help`

打印帮助信息。

---

## 输出结果怎么看

执行后，脚本会输出类似下面的总结：

```text
Updated 8 file(s), 17 replacement(s).
- package.json (2)
- electron-builder.yml (4)
- src/i18n/locales/en/settings.json (3)
```

如果使用 `--dry-run`，开头会变成：

```text
Would update 8 file(s), 17 replacement(s).
```

如果没有命中任何受管控品牌文案，会输出：

```text
No managed brand copy matched the source brand.
```

如果 `from` 和 `to` 一样，会直接退出并提示：

```text
Source and target brand are identical; nothing to do.
```

---

## 一个典型示例

假设你想把默认品牌 `ClawX` 换成 `BaseClaw`。

先预览：

```bash
pnpm rename:brand -- --to "BaseClaw" --dry-run
```

确认列表合理之后正式执行：

```bash
pnpm rename:brand -- --to "BaseClaw"
```

然后检查差异：

```bash
git diff
```

---

## 为什么不用全局替换

因为品牌替换这件事非常容易误伤工程内部标识。

如果直接全仓库替换：

- 可能改坏包名
- 可能改坏内部 API 标识
- 可能改坏测试快照
- 可能误改仓库名、发布配置、自动化脚本
- 可能把本来就不该展示给用户的工程引用一起改掉

这个脚本的价值就在于：

- 它是一种“可控替换”
- 先定义边界，再在边界内批量处理
- 让品牌替换的成本下降，同时减少事故概率

---

## 已知限制

### 1. 它不是全自动品牌迁移工具

这个脚本只负责文本层面的受控替换，不会自动处理：

- logo 文件
- 图标资源
- 应用包标识
- 可执行文件名
- 仓库名
- 文档截图里的品牌字样
- 你后来新增但还没被纳入白名单的文件

### 2. 新文件不会自动被覆盖

如果以后新增了新的用户可见文案文件，但没有加入：

- locale JSON 路径
- `STATIC_TARGETS`

脚本不会改到它们。

### 3. 某些上下文需要人工确认

即便是用户可见文本，有些地方是不是应该跟着品牌改，也可能需要产品判断。例如：

- 第三方集成描述
- 兼容性提示
- 迁移文案
- 保留旧品牌做兼容说明的地方

---

## 如果要扩展这个脚本，应该改哪里

核心逻辑都在：

- `scripts/rename-brand.mjs`

重点看这几个部分：

- `DEFAULT_FROM`
  设定默认旧品牌名
- `STATIC_TARGETS`
  设定哪些静态文件参与替换，以及每个文件只允许哪些行被替换
- `isLocaleFile()`
  定义 locale 文件识别逻辑
- `transformManagedFile()`
  定义不同文件的实际替换行为
- `collectManagedFiles()`
  汇总所有受管控文件

如果你新增了一个“应当参与品牌替换”的用户可见文件，通常做法是：

1. 先判断它是不是 locale JSON
2. 如果不是，就把它加入 `STATIC_TARGETS`
3. 再给这个脚本补一个单测

对应测试文件是：

- `tests/unit/rename-brand.test.ts`

---

## 建议的维护方式

这个脚本适合作为“品牌二开辅助工具”，长期保留，但要坚持一个原则：

- 宁可漏改，也不要误改

也就是说，新增替换范围时，优先采用：

- 明确白名单
- 明确匹配行
- 明确单测覆盖

而不是把它做成一个全仓扫描替换器。

这样它才会一直保持可用、可预测、可回滚。

---

## 相关文件

- `scripts/rename-brand.mjs`
- `tests/unit/rename-brand.test.ts`
- `package.json`

如果你刚接手这块，推荐同时看这两篇文档：

- `docs/preinstalled-skills-and-agents.md`
- 当前这篇 `docs/rename-brand-script.md`
