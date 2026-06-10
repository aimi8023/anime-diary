# 主题配置指南 - 透明度调整

## 🎨 快速调整毛玻璃透明度

所有透明度相关的变量都在 `app/globals.css` 文件中，你可以手动修改这些值来调整视觉效果。

### 关键变量位置

打开 `app/globals.css`，找到以下部分进行修改：

#### 1. **主毛玻璃卡片** (.glass)
```css
.glass {
  background: rgba(255, 255, 255, 0.35);  /* 👈 调整这个值 (0.0 - 1.0) */
  backdrop-filter: blur(10px);             /* 👈 模糊强度 (0px - 30px) */
  border: 1px solid rgba(255, 255, 255, 0.5);  /* 👈 边框透明度 */
}
```

**推荐范围：**
- 背景透明度：`0.25` - `0.45`（越小越透明）
- 模糊强度：`8px` - `15px`（越大越模糊）
- 边框透明度：`0.4` - `0.7`

---

#### 2. **悬停效果** (.glass-hover:hover)
```css
.glass-hover:hover {
  background: rgba(255, 255, 255, 0.5);  /* 👈 悬停时的透明度 */
}
```

**推荐范围：** `0.45` - `0.65`

---

#### 3. **输入框** (.glass-input)
```css
.glass-input {
  background: rgba(255, 255, 255, 0.4);  /* 👈 输入框背景透明度 */
  backdrop-filter: blur(8px);            /* 👈 输入框模糊强度 */
  border: 1px solid rgba(255, 255, 255, 0.6);  /* 👈 输入框边框透明度 */
}
```

**推荐范围：**
- 背景透明度：`0.35` - `0.55`
- 模糊强度：`6px` - `12px`

---

### 预设方案参考

#### 方案 A：更透明轻盈 (zi0.cc 风格)
```css
.glass {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
}
```

#### 方案 B：当前默认 (平衡)
```css
.glass {
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.5);
}
```

#### 方案 C：更实更清晰
```css
.glass {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.7);
}
```

---

### 如何测试效果

1. 修改 `app/globals.css` 中的值
2. 保存文件
3. 浏览器会自动热重载（如果开发服务器正在运行）
4. 按 `Ctrl + Shift + R` 硬刷新查看效果
5. 重复调整直到满意

---

### 其他可调整项

#### 圆角大小
在所有使用 `rounded-xl`、`rounded-lg`、`rounded-full` 的地方可以改为：
- `rounded-md` = 6px
- `rounded-lg` = 8px  
- `rounded-xl` = 12px
- `rounded-2xl` = 16px
- `rounded-3xl` = 24px

#### 阴影强度
搜索 `box-shadow` 并调整数值：
```css
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
           /* ↑   ↑    ↑         ↑          */
           /* x偏移 y偏移 模糊半径 颜色透明度 */
```

---

### 注意事项

⚠️ **不要删除或修改以下行：**
- `backdrop-filter` 和 `-webkit-backdrop-filter`（必须同时存在以兼容不同浏览器）
- `position: relative` 和 `overflow: hidden`（用于伪元素效果）

💡 **提示：** 如果你不确定某个值的效果，可以先备份文件再修改！
