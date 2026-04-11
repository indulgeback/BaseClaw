# 预装 Skills 与默认 Agents 说明

## 目的

这篇文档说明 BaseClaw / ClawX 当前关于“安装后自带的 skill”和“默认 agent”的定义位置、打包来源、启动时安装逻辑、配置写入位置，以及几个容易混淆的概念。

适合排查下面这类问题：

- 某个 skill 为什么在新安装后会自动出现
- 某个 skill 为什么会默认启用
- Setup 向导里展示的 skill 和真正预装的 skill 为什么不一致
- 默认 `main` agent 是在哪里定义出来的
- `AGENTS.md` / `TOOLS.md` 这些 workspace 上下文是怎么进入 agent 工作区的

---

## 一、结论速览

当前项目里，这几类内容分别定义在不同位置：

- 预装 skill 清单定义在 `resources/skills/preinstalled-manifest.json`
- 预装 skill 的安装与自动启用逻辑在 `electron/utils/skill-config.ts`
- 预装 skill 的打包来源和拉取脚本在 `scripts/bundle-preinstalled-skills.mjs`
- 应用启动时触发预装 skill 安装的入口在 `electron/main/index.ts`
- Setup 页面里展示的“default skills”定义在 `src/pages/Setup/index.tsx`
- 默认 agent 的定义和兜底生成逻辑在 `electron/utils/agent-config.ts`
- ClawX 注入到 workspace 的上下文片段在 `resources/context/*.clawx.md`
- 这些上下文片段合并进工作区文件的逻辑在 `electron/utils/openclaw-workspace.ts`

---

## 二、预装 Skills 定义在哪里

### 1. 清单文件

真正决定“安装后会自带哪些 skill”的源头是：

- `resources/skills/preinstalled-manifest.json`

这个文件里的每个条目至少描述：

- `slug`: 最终安装到 `~/.openclaw/skills/<slug>` 的目录名
- `repo`: 预装 skill 的来源 GitHub 仓库
- `repoPath`: 仓库里要抽取的路径
- `ref`: 拉取哪个分支或 ref
- `version`: 预期版本标记
- `autoEnable`: 安装后是否自动写入配置并启用

当前清单里包含这些 skill：

- `pdf`
- `xlsx`
- `docx`
- `pptx`
- `find-skills`
- `self-improving-agent`
- `tavily-search`
- `brave-web-search`

其中这些字段是关键行为开关：

- `slug` 决定本地目录名
- `autoEnable: true` 决定是否在安装后自动写入 `~/.openclaw/openclaw.json`

### 2. `bundles.json` 不是预装 skill 清单

另一个容易混淆的文件是：

- `resources/skills/bundles.json`

它表示技能分类或推荐组合，用于 UI 分组展示，不是“安装后自动部署到本地”的来源清单。也就是说：

- `preinstalled-manifest.json` 决定“预装什么”
- `bundles.json` 决定“页面上怎么分类展示”

---

## 三、预装 Skills 是怎么被打包进应用的

### 1. 打包脚本

预装 skill 的抓取和构建由下面脚本完成：

- `scripts/bundle-preinstalled-skills.mjs`

这个脚本会：

1. 读取 `resources/skills/preinstalled-manifest.json`
2. 按 `repo + ref` 分组
3. 用 `git fetch` + `git archive` 从远程仓库抽取指定路径
4. 把每个 skill 目录复制到 `build/preinstalled-skills/<slug>`
5. 生成 `build/preinstalled-skills/.preinstalled-lock.json`

`.preinstalled-lock.json` 记录的是解析后的版本信息，主要用于：

- 标记本次打包到底落到了哪个 commit
- 启动时做版本判断
- 给本地安装 marker 提供 `desiredVersion`

### 2. 开发环境的准备脚本

在开发模式下，如果 `build/preinstalled-skills/.preinstalled-lock.json` 不存在，会由：

- `scripts/prepare-preinstalled-skills-dev.mjs`

尝试自动触发一次 `bundle-preinstalled-skills.mjs`。

这意味着开发模式下也尽量保证预装 skill 目录存在，但如果网络获取失败，开发启动不会被阻塞。

---

## 四、预装 Skills 是怎么在启动时安装到本地的

### 1. 启动入口

应用主进程启动后，会在：

- `electron/main/index.ts`

调用：

- `ensureBuiltinSkillsInstalled()`
- `ensurePreinstalledSkillsInstalled()`

当前真正有内容的是 `ensurePreinstalledSkillsInstalled()`；`ensureBuiltinSkillsInstalled()` 里的 `BUILTIN_SKILLS` 目前是空数组。

### 2. 核心安装逻辑

真正负责安装预装 skill 的代码在：

- `electron/utils/skill-config.ts`

主要流程如下：

1. `readPreinstalledManifest()`
   读取 `resources/skills/preinstalled-manifest.json`
2. `resolvePreinstalledSkillsSourceRoot()`
   定位预装 skill 的来源目录
   候选通常是：
   - `resources/preinstalled-skills`
   - `build/preinstalled-skills`
   - 其他打包后资源路径
3. `readPreinstalledLockVersions()`
   读取 `.preinstalled-lock.json`
4. 遍历 manifest 中的每个 skill
5. 将来源目录复制到：
   - `~/.openclaw/skills/<slug>`
6. 写入 marker 文件：
   - `~/.openclaw/skills/<slug>/.clawx-preinstalled.json`
7. 如果 `autoEnable` 为 `true`，则把该 skill 加入启用列表
8. 最后通过 `setSkillsEnabled()` 把这些 skill 写入：
   - `~/.openclaw/openclaw.json`

### 3. 安装目标路径

预装 skill 最终落地目录是：

```text
~/.openclaw/skills/<slug>/
```

例如：

```text
~/.openclaw/skills/pdf/
~/.openclaw/skills/docx/
~/.openclaw/skills/tavily-search/
```

### 4. 自动启用写入哪里

自动启用并不是只靠目录存在，而是会写配置：

```json
{
  "skills": {
    "entries": {
      "pdf": { "enabled": true },
      "docx": { "enabled": true }
    }
  }
}
```

也就是写入：

- `~/.openclaw/openclaw.json`
- 路径：`skills.entries.<skillKey>.enabled`

### 5. 为什么不会随便覆盖用户本地 skill

`ensurePreinstalledSkillsInstalled()` 有一套保护策略：

- 如果本地不存在该 skill，则安装
- 如果本地已存在 `SKILL.md`，但没有 `.clawx-preinstalled.json` marker，则视为用户自管，不覆盖
- 如果 marker 存在且版本相同，则跳过
- 如果 marker 存在但版本不同，当前默认也是跳过，避免覆盖本地修改

也就是说，这套逻辑整体偏保守，重点是“预装一次”和“尽量不破坏用户修改”。

---

## 五、Setup 页面里的 “default skills” 是什么

### 1. 定义位置

Setup 向导里显示的默认组件在：

- `src/pages/Setup/index.tsx`

函数：

- `getDefaultSkills()`

当前列出的内容是：

- `opencode`
- `python-env`
- `code-assist`
- `file-tools`
- `terminal`

### 2. 这不等于真正的预装 skill

这是当前最容易误解的地方。

Setup 页面里的这些“default skills”：

- 主要是安装流程中的 UI 文案与步骤展示
- 不对应 `preinstalled-manifest.json`
- 不会直接把 marketplace / repo skill 安装到 `~/.openclaw/skills`

安装阶段真正执行的是：

- `invokeIpc('uv:install-all')`

这更偏向：

- 安装 `uv`
- 准备 Python 运行环境
- 完成基础工具链初始化

所以可以把这两类概念分开理解：

- `preinstalled-manifest.json`: 应用级预装 skill
- Setup `getDefaultSkills()`: 向导阶段的环境初始化展示项

---

## 六、默认 Agent 定义在哪里

### 1. 默认主 agent 的常量

默认 agent 的核心定义在：

- `electron/utils/agent-config.ts`

关键常量：

- `MAIN_AGENT_ID = 'main'`
- `MAIN_AGENT_NAME = 'Main Agent'`
- `DEFAULT_WORKSPACE_PATH = '~/.openclaw/workspace'`

### 2. 隐式主 agent 的生成逻辑

如果 `~/.openclaw/openclaw.json` 里没有 `agents.list`，代码不会让界面显示“没有 agent”，而是会自动生成一个隐式主 agent。

这个逻辑在：

- `createImplicitMainEntry(config)`
- `normalizeAgentsConfig(config)`

行为是：

- 自动创建一个 `id = main`
- 名称为 `Main Agent`
- workspace 默认指向 `~/.openclaw/workspace`
- agentDir 默认指向 `~/.openclaw/agents/main/agent`

这个默认主 agent 是“代码层兜底生成”的，不一定要求配置文件里事先写好一份静态 manifest。

### 3. 新建 agent 时会写回配置

用户新建 agent 时，`createAgent()` 会真正把数据写回：

- `~/.openclaw/openclaw.json`

写入结构主要是：

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "name": "Main Agent",
        "default": true,
        "workspace": "~/.openclaw/workspace",
        "agentDir": "~/.openclaw/agents/main/agent"
      },
      {
        "id": "research",
        "name": "Research",
        "workspace": "~/.openclaw/workspace-research",
        "agentDir": "~/.openclaw/agents/research/agent"
      }
    ]
  }
}
```

默认 `main` agent 在首次无配置时主要靠隐式逻辑提供，新建额外 agent 时则会开始显式写入 `agents.list`。

---

## 七、Agent 的工作目录和运行目录怎么来的

### 1. workspace

主 agent 默认 workspace：

```text
~/.openclaw/workspace
```

新 agent 默认 workspace：

```text
~/.openclaw/workspace-<agentId>
```

### 2. agentDir

agent 运行目录默认是：

```text
~/.openclaw/agents/<agentId>/agent
```

例如：

```text
~/.openclaw/agents/main/agent
~/.openclaw/agents/research/agent
```

### 3. 新 agent 创建时会复制什么

`createAgent()` 最终会调用 `provisionAgentFilesystem()`，它会：

- 创建 workspace
- 创建 agentDir
- 创建 sessions 目录
- 在需要时复制运行时文件

当 `inheritWorkspace` 为 `true` 时，还会复制主 agent workspace 下的 bootstrap 文件，例如：

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `USER.md`
- `IDENTITY.md`
- `HEARTBEAT.md`
- `BOOT.md`

如果 `inheritWorkspace` 为 `false`，则不会主动复制这些 bootstrap 文件，而是让 OpenClaw Gateway 后续自己去 seed 默认模板。

---

## 八、Workspace 里的 `AGENTS.md` / `TOOLS.md` 是怎么来的

这里又分成两层：

### 1. OpenClaw 自己的基础模板

代码里明确写了一个约定：

- 如果目标 workspace 里这些 bootstrap 文件还不存在，Gateway 会负责 seed 默认模板

也就是说，像 `AGENTS.md`、`SOUL.md`、`TOOLS.md` 这些基础文件，底板主要来自 OpenClaw / Gateway 自己的启动逻辑。

### 2. ClawX 额外合并进去的上下文

ClawX 还会在这些已有文件中追加一个带 marker 的片段，来源在：

- `resources/context/AGENTS.clawx.md`
- `resources/context/TOOLS.clawx.md`

合并逻辑在：

- `electron/utils/openclaw-workspace.ts`

关键函数：

- `ensureClawXContext()`
- `mergeClawXContextOnce()`
- `mergeClawXSection()`

其行为是：

1. 找到所有声明过的 workspace
2. 查找 `resources/context/*.clawx.md`
3. 把 `AGENTS.clawx.md` 合并进 workspace 下已有的 `AGENTS.md`
4. 把 `TOOLS.clawx.md` 合并进 workspace 下已有的 `TOOLS.md`
5. 如果目标文件还不存在，则先跳过，等待 Gateway seed 完基础模板后再重试

ClawX 合并内容使用固定 marker 包裹：

```html
<!-- clawx:begin -->
...
<!-- clawx:end -->
```

这样后续可以重复更新同一段，而不是无限追加重复内容。

---

## 九、从“安装完成”到“可以使用”的完整链路

### Skills 链路

1. 开发或打包阶段读取 `resources/skills/preinstalled-manifest.json`
2. `scripts/bundle-preinstalled-skills.mjs` 从 GitHub 拉取 skill 内容
3. 产物进入 `build/preinstalled-skills/`
4. 应用启动
5. `electron/main/index.ts` 调用 `ensurePreinstalledSkillsInstalled()`
6. skill 被复制到 `~/.openclaw/skills/<slug>/`
7. 对 `autoEnable` 的 skill，写入 `~/.openclaw/openclaw.json`
8. OpenClaw 运行时从 skills 目录和配置中识别并加载这些 skill

### Agents 链路

1. 应用读取 `~/.openclaw/openclaw.json`
2. 如果没有 `agents.list`，`agent-config.ts` 自动生成隐式 `main` agent
3. 主 agent 默认使用 `~/.openclaw/workspace` 和 `~/.openclaw/agents/main/agent`
4. Gateway 启动并 seed 缺失的 bootstrap 文件
5. `ensureClawXContext()` 把 `resources/context/*.clawx.md` 合并进现有 workspace 文件
6. 若用户新建 agent，则 `createAgent()` 写入 `agents.list` 并创建对应目录

---

## 十、最容易混淆的几个点

### 1. `preinstalled-manifest.json` 和 Setup 页面不是同一套东西

不是。

- `preinstalled-manifest.json` 决定“应用启动后会自动部署哪些 skill”
- Setup 页的 `getDefaultSkills()` 决定“安装向导阶段给用户展示哪些基础能力项”

### 2. `bundles.json` 也不是预装清单

不是。

- `bundles.json` 偏向 UI 分类和推荐分组
- `preinstalled-manifest.json` 才是实际预装来源

### 3. 默认 `main` agent 不一定预先写在配置文件里

对。

当 `agents.list` 为空时，代码会隐式生成 `main` agent 作为兜底。

### 4. `AGENTS.md` / `TOOLS.md` 的完整内容不完全来自 ClawX

对。

- 基础模板通常由 Gateway seed
- ClawX 只是在此基础上合并自己的上下文片段

---

## 十一、如果要修改这套行为，应该改哪里

### 场景 1：新增或移除一个安装后自带的 skill

优先改：

- `resources/skills/preinstalled-manifest.json`

然后确认：

- `scripts/bundle-preinstalled-skills.mjs`
- `build/preinstalled-skills/` 是否重新生成

### 场景 2：改变某个预装 skill 是否默认启用

改：

- `resources/skills/preinstalled-manifest.json` 中对应条目的 `autoEnable`

### 场景 3：改变 Setup 向导里展示的默认技能项

改：

- `src/pages/Setup/index.tsx` 里的 `getDefaultSkills()`

### 场景 4：改变默认主 agent 的名字、ID、默认路径

改：

- `electron/utils/agent-config.ts`

重点关注：

- `MAIN_AGENT_ID`
- `MAIN_AGENT_NAME`
- `DEFAULT_WORKSPACE_PATH`
- `createImplicitMainEntry()`

### 场景 5：改变 ClawX 注入到 workspace 的上下文

改：

- `resources/context/AGENTS.clawx.md`
- `resources/context/TOOLS.clawx.md`

如需改合并策略，再看：

- `electron/utils/openclaw-workspace.ts`

---

## 十二、相关源码索引

### Skills

- `resources/skills/preinstalled-manifest.json`
- `resources/skills/bundles.json`
- `scripts/bundle-preinstalled-skills.mjs`
- `scripts/prepare-preinstalled-skills-dev.mjs`
- `electron/utils/skill-config.ts`
- `electron/main/index.ts`
- `src/pages/Setup/index.tsx`

### Agents

- `electron/utils/agent-config.ts`
- `electron/utils/openclaw-workspace.ts`
- `resources/context/AGENTS.clawx.md`
- `resources/context/TOOLS.clawx.md`

---

## 十三、建议

如果后续这个项目还会继续扩展“预装 skill / 默认 agent / workspace 上下文”这一套，建议把这三类概念长期分开维护：

- 预装资源清单
- UI 展示清单
- 运行时默认值与兜底逻辑

这样以后排查“为什么用户安装后看到了某个东西”时，就能很快判断它到底属于：

- 打包产物
- 启动安装
- Setup UI
- 配置兜底
- workspace 内容合并

而不会把几条链路混在一起。
