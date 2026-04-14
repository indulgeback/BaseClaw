# SpriteClaw 小浣熊状态视频镜头矩阵

## 当前状态矩阵

| 状态 | 素材类型 | 主图 | 第二图 | 动作目标 | 时长 |
|------|----------|------|--------|----------|------|
| `idle` | 循环片 | 图 2 | 图 3 | 呼吸、眨眼、耳朵轻抖、尾巴轻摆 | 2.5s - 3.5s |
| `listen` | 进入片 / 循环片 / 退出片 | 图 2 | 图 3 | 耳朵立起、头轻歪、注意力聚焦、前爪轻收 | 0.8s - 3.5s |
| `working` | 进入片 / 循环片 / 退出片 | 图 2 | 图 3 | 专注、轻微低头或抬头、眼神工作中、前爪轻动作 | 0.8s - 3.5s |
| `sleep` | 进入片 / 循环片 / 退出片 | 图 2 | 图 3 | 打哈欠、眼皮变沉、头下垂、慢呼吸 | 0.8s - 3.5s |

## 可选参考素材

| 素材名 | 类型 | 主图 | 第二图 | 用途 | 时长 |
|--------|------|------|--------|------|------|
| `N0_hold` | 中性驻点 | 图 2 | 无 | 用于验证角色与抠像，不算最终必须交付片 | 0.8s - 1.2s |

## 当前素材矩阵

| 片名 | 类型 | 主图 | 第二图 | 动作重点 |
|------|------|------|--------|----------|
| `sprite_raccoon_idle_loop_master_v01.mov` | idle 循环 | 图 2 | 图 3 | 呼吸、眨眼、耳朵轻抖、尾巴轻摆 |
| `sprite_raccoon_idle_to_listen_enter_master_v01.mov` | listen 进入片 | 图 2 | 图 3 | 耳朵立起、头轻歪、注意力聚焦 |
| `sprite_raccoon_listen_loop_master_v01.mov` | listen 循环片 | 图 2 | 图 3 | 维持倾听状态的小幅动作 |
| `sprite_raccoon_listen_to_idle_exit_master_v01.mov` | listen 退出片 | 图 2 | 图 3 | 耳朵放松、头回正、回到 idle |
| `sprite_raccoon_idle_to_working_enter_master_v01.mov` | working 进入片 | 图 2 | 图 3 | 进入专注工作状态 |
| `sprite_raccoon_working_loop_master_v01.mov` | working 循环片 | 图 2 | 图 3 | 工作中持续微动作 |
| `sprite_raccoon_working_to_idle_exit_master_v01.mov` | working 退出片 | 图 2 | 图 3 | 从工作中回到 idle |
| `sprite_raccoon_idle_to_sleep_enter_master_v01.mov` | sleep 进入片 | 图 2 | 图 3 | 打哈欠、眼皮变沉、头下垂 |
| `sprite_raccoon_sleep_loop_master_v01.mov` | sleep 循环片 | 图 2 | 图 3 | 慢呼吸、稳定睡眠态 |
| `sprite_raccoon_sleep_to_idle_exit_master_v01.mov` | sleep 退出片 | 图 2 | 图 3 | 睁眼、抬头、回到 idle |

总计：

- 最终必交 10 条主素材
- 可选 1 条参考驻点素材
