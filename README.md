# FPS Counter Pro

A clean, draggable, and fully customizable FPS counter overlay for web games. Built as a Tampermonkey userscript.

Press `Alt + Ctrl + F` to toggle visibility.  
Works on **minefun.io** and all its subdomains.

---

## Features

- Real-time FPS counter with 1-second average, displayed prominently.
- Mini history graph showing the last 60 FPS samples.
- Progress bar that fills based on a configurable maximum FPS target.
- Dynamic colour changes based on performance:
  - Good (>= 90 FPS)
  - Medium (50-89 FPS)
  - Low (< 50 FPS)
- Minimum and maximum FPS tracking.
- Draggable panel – position is saved automatically.
- Settings modal to adjust all visual options without editing code:
  - Panel scale and opacity
  - Colours for each performance tier, text, and border
  - Toggle graph, bar, and min/max display
  - Set the max FPS value used for the bar
  - Reset statistics or panel position
- All preferences are persisted in `localStorage` and survive page reloads.
- Toggle hotkey: `Alt + Ctrl + F` to show/hide instantly.
- No external dependencies – lightweight vanilla JavaScript.

---

## Installation

1. Install a userscript manager extension like Tampermonkey, Greasemonkey, or Violentmonkey.
2. Create a new script and paste the full source code.
3. Save the script – it will run automatically on `minefun.io` and its subdomains.

---

## Usage

Once installed, the FPS panel appears in the top-left corner of the page.

- **Drag** the panel by its top area to move it anywhere.
- Click the **gear icon** to open the settings window and tweak appearance.
- Click the **X** button to hide the panel; use `Alt + Ctrl + F` to bring it back.
- The hotkey will not fire when you are typing in an input field or text area.

All changes are stored locally and will persist across sessions.

---

## Customization Reference

All settings are accessible through the in‑panel settings modal. If you prefer to pre‑configure them, you can set the following `localStorage` keys before the script runs:

| Key              | Type    | Default   | Description                      |
|------------------|---------|-----------|----------------------------------|
| `fps_visible`    | string  | `"true"`  | Panel visibility (`"true"`/`"false"`) |
| `fps_x`          | number  | `20`      | Panel X position (px)            |
| `fps_y`          | number  | `20`      | Panel Y position (px)            |
| `fps_graph`      | string  | `"true"`  | Show history graph               |
| `fps_bar`        | string  | `"true"`  | Show progress bar                |
| `fps_minmax`     | string  | `"true"`  | Show min/max values              |
| `fps_good`       | hex     | `#0ff`    | Colour when FPS >= 90            |
| `fps_medium`     | hex     | `#ffaa44` | Colour when 50 <= FPS < 90       |
| `fps_low`        | hex     | `#ff4444` | Colour when FPS < 50             |
| `fps_text`       | hex     | `#e0e0ff` | Text colour                      |
| `fps_border`     | hex     | `#0ff`    | Panel border and glow colour     |
| `fps_max_target` | number  | `240`     | Max FPS used for bar scaling     |
| `fps_scale`      | number  | `1`       | Panel scale factor               |
| `fps_opacity`    | number  | `0.95`    | Panel background opacity         |

---

## Author

**Itz_Krishna AKA Everlasting**
