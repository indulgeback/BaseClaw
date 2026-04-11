# SpriteClaw 小浣熊视频 DaVinci 抠像验收清单

## 抠像前检查

在导入 DaVinci 前，先确认原视频是否满足：

- 背景为纯绿色
- 背景无明显渐变
- 背景无道具
- 背景无文字
- 无额外角色
- 无镜头移动
- 全身完整入镜
- 起始与结尾姿态清晰

如果以上任一项不满足，优先回到生成阶段重做，而不是依赖后期硬救。

---

## 抠像验收清单

### 轮廓清洁度

- 耳朵边缘是否干净
- 胡须边缘是否可接受
- 头顶细毛是否炸边
- 尾巴毛边是否可接受
- 爪子边缘是否完整
- 爪子缝隙是否残留绿边

### 颜色污染

- 鼻口周围是否有绿溢色
- 白色毛区是否被染绿
- 腹部浅色毛是否被污染
- 尾巴浅色环纹是否发绿

### 稳定性

- 角色脸部在全片中是否稳定
- 眼睛位置是否稳定
- 毛发轮廓是否抖动
- 身体比例是否漂移
- 起止帧是否可作为切换点

### 可切换性

- 是否能和 `N0_hold` 对齐
- 是否能和 `idle_loop` 平滑拼接
- 转场片尾部是否能稳定停住至少 4 到 6 帧
- 循环片首尾是否接近同一姿态

---

## 不通过的典型症状

以下情况建议直接判为不通过：

- 角色脸明显变形
- 尾巴环纹漂移
- 抠完后出现大面积绿色边缘
- 结尾动作还在继续，无法作为切换点
- 起始姿态与计划状态不符
- 背景有阴影投到绿幕上
- 角色被裁切出画
- 生成过程中突然出现道具或额外肢体

---

## 通过标准

一条视频只有同时满足下面几点，才算可入库：

- 背景能稳定抠掉
- 角色身份稳定
- 毛发边缘可接受
- 起止姿态可切
- 状态表意清晰
- 放进透明背景 UI 后无明显绿边污染

---

## 命名建议

建议命名规则：

```text
sprite_raccoon_<clip_name>_master_v01.mov
```

示例：

- `sprite_raccoon_idle_loop_master_v01.mov`
- `sprite_raccoon_idle_to_listen_enter_master_v01.mov`
- `sprite_raccoon_listen_loop_master_v01.mov`
- `sprite_raccoon_idle_to_working_enter_master_v01.mov`
- `sprite_raccoon_working_loop_master_v01.mov`
- `sprite_raccoon_idle_to_sleep_enter_master_v01.mov`
- `sprite_raccoon_sleep_loop_master_v01.mov`

透明中间件版本建议：

```text
sprite_raccoon_<clip_name>_alpha_v01.webm
```
