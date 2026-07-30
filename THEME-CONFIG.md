# 水光档案主题配置

项目的视觉来源集中在 `app/globals.css`。业务组件使用语义类，不应复制一组新的颜色、阴影或焦点样式。

## 令牌分组

在 `:root` 中调整：

- 画布：`--canvas`、`--canvas-tint`、`--canvas-blue`
- 表面：`--surface`、`--surface-strong`、`--surface-soft`、`--surface-border`
- 文字：`--ink`、`--ink-muted`、`--ink-subtle`
- 状态：`--accent*`、`--info*`、`--warning*`、`--danger*`
- 阴影：`--shadow-sm`、`--shadow-md`、`--shadow-lg`
- 形状：`--radius-sm`、`--radius-md`、`--radius-lg`、`--radius-pill`
- 动效：`--duration-fast`、`--duration-normal`、`--ease-out`

如果背景图片变亮或变复杂，优先提高 `--surface` 和 `--surface-strong` 的不透明度，不要逐个修改组件。

## 语义类

| 类名 | 用途 |
|---|---|
| `.ui-panel` | 普通内容面板 |
| `.ui-panel-strong` | 表单、工作区、错误状态等主要表面 |
| `.ui-field` | 输入框、下拉框和文本域 |
| `.ui-button` | 所有文字按钮的尺寸与交互基础 |
| `.ui-button-primary` | 当前页面的主要动作 |
| `.ui-button-secondary` | 返回、取消、辅助操作 |
| `.ui-button-danger` | 删除、覆盖或危险确认 |
| `.ui-icon-button` | 关闭、退出等图标按钮 |
| `.ui-chip` | 标签和轻量选择 |
| `.ui-chip-active` | 已选择标签或活动筛选 |
| `.ui-kicker` | 页面或分组的小型英文标识 |
| `.ui-focus` | 非标准控件的统一键盘焦点 |

`.glass` 和 `.glass-input` 是旧组件的兼容别名，新代码不要继续扩展它们。

## 背景与封面

- 背景固定使用 `public/bg.png`，`body::before` 负责静态色洗，`body::after` 负责轻微光点。
- 不增加持续闪烁或漂浮的背景动画。
- 公开作品卡片使用 2:3 海报比例。
- 外部封面使用 `next/image` 并设置 `unoptimized`、明确的 `sizes` 和有尺寸的父容器。

## 动效与可访问性

全局 `prefers-reduced-motion: reduce` 会把动画和过渡缩短到近乎即时。Framer Motion 组件还应使用 `useReducedMotion()` 避免位移或缩放。

所有新控件至少保留 44×44px 交互区域，并使用语义状态色之外的文字或图标说明状态。
