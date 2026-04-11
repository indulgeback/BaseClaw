# SpriteClaw V1 二开说明

## 目标

`spriteClaw-dev` 是基于 BaseClaw `dev` 分支切出的产品定制分支，用于实现 SpriteClaw 的首个完整版本。

这个分支的目标不是复制 PetClaw 的整套产品链路，而是在保留 BaseClaw 现有 IA 和 OpenClaw 集成能力的前提下，完成以下三件事：

- 将产品品牌从 BaseClaw 替换为 `SpriteClaw`
- 为聊天主界面引入 `sprite` 舞台区
- 为 macOS / Windows 引入可独立显示的悬浮桌宠

当前 V1 先上线一个角色：

- `raccoon`

并且提前为未来“用户切换不同角色形象”预留角色注册表和资源结构。

---

## 当前实现范围

V1 当前落地内容包括：

- `SpriteClaw` 品牌替换
- Sprite 主题色与主界面视觉升级
- Chat 页内嵌 `Sprite Stage`
- `idle / listen / working / sleep` 四态状态系统
- 共享的 Sprite 状态载荷与角色配置
- macOS / Windows 悬浮桌宠窗口
- Settings 中的 Sprite 开关与桌宠控制入口

V1 当前明确不做：

- 登录体系
- 用户资料页
- 角色商城或下载中心
- 角色切换 UI
- 语音输入 / 语音唤醒
- 正式状态视频资源

---

## 分支约定

SpriteClaw 的工作分支是：

- `spriteClaw-dev`

建议流程：

```bash
git checkout dev
git pull origin dev
git checkout -b spriteClaw-dev
pnpm rename:brand -- --from "BaseClaw" --to "SpriteClaw"
```

如果后续 `dev` 分支有新基础设施或上游同步内容，需要定期：

```bash
git checkout spriteClaw-dev
git merge dev
```

冲突处理原则：

- 通用基础设施优先保留 `dev`
- SpriteClaw 的品牌、视觉和角色层保留 `spriteClaw-dev`

---

## Sprite 状态约定

当前 V1 的标准状态集合固定为：

```text
idle
listen
working
sleep
```

状态语义如下：

- `idle`: 普通待机
- `listen`: 输入框聚焦、正在输入、或已添加附件但未发送
- `working`: 发送中、处理中、或正在流式输出
- `sleep`: 主窗口失焦、最小化、隐藏到托盘或进入不可见状态

切换规则：

- 任何非 `idle` 状态之间切换，都会先退回 `idle`
- 再从 `idle` 进入目标状态

---

## 角色与资源结构

SpriteClaw V1 的角色系统虽然只上线一个角色，但目录结构必须按“多角色可扩展”设计。

推荐结构：

```text
src/
  lib/
    sprite.ts
  stores/
    sprite.ts
  types/
    sprite.ts
shared/
  sprite.ts
```

角色配置当前由注册表管理，首版只有：

```text
raccoon
```

后续如果要加入更多角色，应继续沿用：

- 一个角色 ID
- 一份角色 profile
- 一套按状态组织的资源清单

而不是把角色逻辑散落到页面组件中。

---

## 占位资源到正式视频的替换策略

当前没有正式的小浣熊状态视频，因此 V1 采用：

- 占位动效先跑通状态机
- 后续无缝替换为视频资源

实现约束：

1. 资源接口必须支持两类类型：
   - `placeholder`
   - `video`
2. 页面组件不能写死“只支持视频”
3. 状态切换逻辑不能依赖具体资源文件存在
4. 将来替换资源时，应只修改角色资源清单，而不是重写状态机

后续正式资源到位时，优先替换：

- `idle`
- `listen`
- `working`
- `sleep`

---

## 悬浮桌宠约定

悬浮桌宠窗口是独立 `BrowserWindow`，但必须和主界面使用同一套：

- `SpriteCharacterId`
- `SpriteState`
- `SpriteStatePayload`

当前约定：

- 仅 macOS / Windows 开启
- Linux 保留主界面 Sprite，不显示桌宠窗口
- E2E 模式下不自动弹出桌宠，避免影响测试窗口选择
- 桌宠点击后聚焦主窗口
- 桌宠关闭为“本次会话隐藏”，可通过 Settings 或 Tray 重新打开

---

## 对外文案约定

当前分支默认对外品牌名统一为：

- `SpriteClaw`

工程或历史层面仍可能保留：

- `ClawX`
- `BaseClaw`

这类名称出现在注释、上游兼容说明、脚本历史上下文里是允许的，但用户直接可见的产品文案应优先统一到 `SpriteClaw`。

重点检查区域：

- `package.json`
- `electron-builder.yml`
- `README.md`
- `README.zh-CN.md`
- `README.ja-JP.md`
- `resources/cli/*`
- `resources/context/*`
- `src/i18n/locales/*`

---

## 测试约定

只要 SpriteClaw 相关 UI 有新增或改动，就至少需要覆盖：

### 单测

- Sprite 状态推导
- 桌宠窗口生命周期

### Electron E2E

- Chat 欢迎页中的 `Sprite Stage`
- 桌宠窗口可打开，且能接收主界面的初始状态同步

如果后续引入真实视频资源，还应补充：

- 资源缺失时的降级渲染
- 视频资源加载失败时的回退行为

---

## 后续扩展建议

当 V1 稳定后，SpriteClaw 的下一步扩展建议按这个顺序推进：

1. 小浣熊正式视频资源接入
2. 角色切换 UI
3. 角色 profile / 性格文案差异化
4. 桌宠交互增强
5. 语音或提醒型陪伴能力

这样可以保持：

- 当前首版先完整可用
- 后续每一步都建立在已有的状态机和资源协议之上
- 不会因为补资源或加角色而推翻现有实现

---

## 配套视频文档

如果要开始为小浣熊生成状态视频，请同时参考：

- `docs/spriteclaw-raccoon-video-production-plan.md`
- `docs/spriteclaw-raccoon-video-shot-matrix.md`
- `docs/spriteclaw-raccoon-video-prompts.md`
- `docs/spriteclaw-raccoon-davinci-checklist.md`
