# SpriteClaw 小浣熊状态视频生产方案

## 目标

本方案用于指导 SpriteClaw 当前小浣熊角色的视频生产，目标是生成一套可直接服务于当前四态状态系统的状态视频素材，并保证后续在应用内切换时尽量自然、易抠像、易维护。

当前仓库状态已收敛为：

- `idle`
- `listen`
- `working`
- `sleep`

本轮视频生产已锁定以下制作策略：

- 素材类型：`idle loop + 其他 3 态的 enter / loop / exit`
- 生成方式：图生视频通用方案
- 背景策略：纯绿色背景，后续用达芬奇扣透明
- 动作强度：中等表演级
- 当前角色：baby raccoon / raccoon cub
- 当前提示词风格：Kling 可用的短版 prompt，强调“开始姿态 -> 中段动作峰值 -> 回到开始姿态”

本方案只服务于当前单角色小浣熊首版，不引入多角色切换或场景化道具版资产。

---

## 核心原则

1. 角色一致性优先于动作花哨
2. 所有片子都围绕同一个中性锚点姿态生成
3. 绿幕可抠性优先于场景表现
4. 转场不做全连接，采用锚点枢纽结构避免素材爆炸
5. 所有循环片 prompt 都按“三段式动作曲线”写法组织，而不是只写状态形容词
6. 非 `idle` 状态之间不直接切换，必须先回 `idle`

---

## 参考图使用策略

### 图 2：主身份锚图

文件：

- `baby_raccoon_cub_3d_render_v2.jpg`

职责：

- 锁定脸型
- 锁定眼睛比例
- 锁定鼻口位置
- 锁定正面坐姿
- 锁定毛色
- 锁定尾巴环纹

结论：

- 所有状态视频都应以图 2 作为第一参考图

### 图 3：结构一致性辅助图

文件：

- `baby_raccoon_turnaround_three_view.jpg`

职责：

- 锁定侧脸轮廓
- 锁定背部毛量
- 锁定尾巴朝向
- 锁定身体厚度

优先用途：

- `working`
- `listen`
- `sleep`
- 各类 transition

结论：

- 当工具支持第二张参考图时，图 3 是默认的第二参考图

### 图 1：概念板，仅作风格存档

文件：

- `baby_raccoon_12_scene_concept_board.jpg`

当前策略：

- 不再将图 1 用作视频生成参考图
- 不再按格裁切后送入图生视频

原因：

- 强动作参考容易把模型拉向不自然的姿态跳变
- 对当前“状态先退回 idle 再切换”的机制帮助不大
- 更容易破坏角色连续性

结论：

- 视频生成阶段只使用图 2 和图 3

---

## 中性锚点设计

### 锚点姿态定义

统一锚点姿态 `N0`：

- 小浣熊正面坐姿
- 机位完全固定
- 身体在画面正中
- 双爪自然放在肚前
- 尾巴向角色右侧轻弯
- 头部微正
- 眼睛看向镜头
- 表情中性偏友好
- 绿幕纯背景
- 无道具
- 无地面阴影污染背景
- 无镜头移动

### 第一批建议先产出的基础素材

- `N0_hold`
- `idle_loop`

说明：

- `N0_hold` 是建议先做的参考驻点，用来验证人物一致性
- 它不是最终必须交付到程序内的状态视频
- 当前最终交付仍以 `idle loop + listen/working/sleep 的 enter/loop/exit` 为主

## 当前 Kling 提示词写法约束

为了适配你现在的 Kling 首尾帧循环流程，后续所有循环片都统一按下面的结构写：

- 第一段：锁角色和镜头
- 第二段：明确起始姿态
- 第三段：强调中段出现可见动作峰值
- 第四段：强调结尾回到起始姿态

关键不是写很多形容词，而是明确告诉模型：

- starts in the exact pose
- motion becomes clearly visible in the middle
- returns to the exact starting pose

---

## 素材结构设计

推荐结构：

- `idle_loop`
- `idle_to_listen_enter`
- `listen_loop`
- `listen_to_idle_exit`
- `idle_to_working_enter`
- `working_loop`
- `working_to_idle_exit`
- `idle_to_sleep_enter`
- `sleep_loop`
- `sleep_to_idle_exit`

切换默认路径：

- 任何状态切换，都先退回 `idle`
- 再从 `idle` 进入目标状态

例如：

- `listen -> working`
  - `listen_to_idle_exit`
  - `idle_to_working_enter`
  - `working_loop`

这样做的好处：

- 不需要制作非 idle 状态之间的全连接转场
- 大幅减少素材数量
- 切换规则更稳定
- 后续接入代码时状态机更清晰

---

## 统一输出规格

- 分辨率：`1080 x 1080`
- 帧率：`24fps`
- 循环片时长：`2.5s ~ 3.5s`
- 事件片时长：`1.2s ~ 2.0s`
- 转场片时长：`0.6s ~ 1.0s`
- 镜头：固定机位
- 构图：全身完整入镜
- 背景：纯绿色无纹理背景
- 光线：柔和棚拍、边缘清晰、尽量无绿溢色

---

## 状态生产顺序

### Phase 1：锚点与 idle

1. `N0_hold`
2. `idle_loop`

### Phase 2：listen 组

1. `idle_to_listen_enter`
2. `listen_loop`
3. `listen_to_idle_exit`

### Phase 3：working 组

1. `idle_to_working_enter`
2. `working_loop`
3. `working_to_idle_exit`

### Phase 4：sleep 组

1. `idle_to_sleep_enter`
2. `sleep_loop`
3. `sleep_to_idle_exit`

---

## 文件命名规范

统一采用：

```text
sprite_raccoon_<clip_name>_master_v01.mov
```

最终主素材示例：

- `sprite_raccoon_idle_loop_master_v01.mov`
- `sprite_raccoon_idle_to_listen_enter_master_v01.mov`
- `sprite_raccoon_listen_loop_master_v01.mov`
- `sprite_raccoon_listen_to_idle_exit_master_v01.mov`
- `sprite_raccoon_idle_to_working_enter_master_v01.mov`
- `sprite_raccoon_working_loop_master_v01.mov`
- `sprite_raccoon_working_to_idle_exit_master_v01.mov`
- `sprite_raccoon_idle_to_sleep_enter_master_v01.mov`
- `sprite_raccoon_sleep_loop_master_v01.mov`
- `sprite_raccoon_sleep_to_idle_exit_master_v01.mov`

可选参考素材：

- `sprite_raccoon_n0_hold_master_v01.mov`

如果后续导出透明 WebM：

```text
sprite_raccoon_<clip_name>_alpha_v01.webm
```

---

## DaVinci 后期要求

所有生成 prompt 都必须强调：

- pure solid green chroma background
- minimal green spill
- no shadow cast on background
- clean edges around fur

抠像验收重点：

- 耳朵边缘
- 胡须边缘
- 尾巴毛边
- 爪子缝隙
- 身体轮廓稳定性

一条片子只有同时满足下面几点，才算可入 SpriteClaw：

- 背景能稳定抠掉
- 角色身份稳定
- 起止姿态可切
- 转场结尾能停稳
- 放入透明 UI 后无明显绿边污染

---

## 关联文档

- `docs/spriteclaw-raccoon-video-shot-matrix.md`
- `docs/spriteclaw-raccoon-video-prompts.md`
- `docs/spriteclaw-raccoon-davinci-checklist.md`
