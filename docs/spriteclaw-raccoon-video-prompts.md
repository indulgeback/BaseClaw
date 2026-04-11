# SpriteClaw 小浣熊视频提示词库

## 通用主提示词模板

```text
Use the attached baby raccoon cub as the exact character identity reference.
Keep the same face pattern, same eye size, same fluffy gray fur, same striped tail, same body proportions, same cute 3D render style.
Preserve the existing pure green chroma key background exactly as shown in the reference image.
Full body visible, centered in frame, fixed locked camera, no zoom, no pan, no rotation, no camera shake.
Soft studio lighting, clean edge separation, minimal green spill on fur.
Stable anatomy, stable facial features, no morphing.
```

## 通用负面提示词模板

```text
No camera movement, no scene change, no white background, no props, no furniture, no extra characters, no extra limbs, no duplicate tail, no face drift, no body morph, no species change, no clothing, no accessories.
```

## 中性锚点提示词

### `N0_hold`

参考图：

- 主图：图 2

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact neutral seated pose, hold the pose almost still with only tiny breathing, then end in the exact same pose
```

### `idle_loop`

参考图：

- 主图：图 2
- 第二图：图 3

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact neutral seated pose, make a clearly visible idle motion in the middle: chest rise, one slow blink, small head lift and tiny head tilt, one ear twitch, one slow tail sway, then return to the exact starting pose for a seamless loop
```

## listen 组提示词

### `idle_to_listen_enter`

参考图：

- 主图：图 2
- 第二图：图 3

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact neutral seated pose, then smoothly transition into a clear attentive listening pose: ears lift, head tilts slightly, eyes focus forward, paws gather a little closer to the chest, body becomes alert and engaged, end by holding the listening pose steadily in the final frame
```

### `listen_loop`

参考图：

- 主图：图 2
- 第二图：图 3

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact listening pose, make the middle motion more obvious: ears stay perked, the head gives a small curious tilt and micro correction, the eyes stay focused forward, the paws shift slightly closer, then return to the exact same listening pose for a seamless loop
```

### `listen_to_idle_exit`

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start from a stable listening pose, ease back into the exact neutral seated pose, ears relax, head returns to center, tail settles
```

## working 组提示词

### `idle_to_working_enter`

Prompt：

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact neutral seated pose, then smoothly transition into a clear working pose: the head lowers slightly, the eyes focus with concentration, one paw lifts subtly toward the chest, the body becomes engaged and busy, end by holding the working pose steadily in the final frame
```

### `working_loop`

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact working pose, make the middle motion clearly visible: a small thoughtful head motion, one focused eye movement, a subtle paw lift or shift, one slow tail sway, then return to the exact same working pose for a seamless loop
```

### `working_to_idle_exit`

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start from a stable working pose, soften the focus, lower the paw, bring the head and body back to the exact neutral seated pose
```

## sleep 组提示词

### `idle_to_sleep_enter`

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact neutral seated pose, then smoothly transition into a sleepy pose: one small yawn, eyelids droop, head lowers gently, body relaxes, end by holding the sleep pose steadily in the final frame
```

### `sleep_loop`

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start in the exact sleep pose, make the middle motion subtle but visible: slow breathing, tiny eyelid flutter or tiny head dip, very soft tail stillness, then return to the exact same sleep pose for a seamless loop
```

### `sleep_to_idle_exit`

```text
same baby raccoon cub, same face, same fur, same striped tail, full body centered, fixed camera, pure green chroma key background

start from a stable sleep pose, wake up gently, eyes open gradually, head lifts, ears perk slightly, then return to the exact neutral seated pose
```
