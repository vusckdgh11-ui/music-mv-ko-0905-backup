# Music MV

**English** | [中文](./README.zh-CN.md)

> Lyrics + Audio + Background Image = Music Video

Upload lyrics (LRC), audio, and a background image to generate a scrolling lyric music video. Entirely browser-based, no server required.

## Features

- **One-click generation** - Upload 3 files and export a music video in MP4
- **Real-time preview** - Remotion Player renders a live preview while you configure
- **12 style combinations** - 2 aspect ratios x 2 visual styles x 3 dynamic effects
- **Audio spectrum** - Automatic frequency analysis with animated visualizer bars
- **CD disc animation** - Spinning CD disc with slide-in animation, using the background image as cover art
- **Lyric sync** - Precise time-axis sync with highlighted current lyric animation
- **i18n** - Chinese (zh-CN) and English (en)
- **Drag & drop upload**

## Preview

| 16:9 Landscape | 9:16 Portrait |
|---|---|
| ![16:9](docs/16:9.png) | ![9:16](docs/9:16.png) |

## Tech Stack

- [React](https://react.dev/) 18
- [Remotion](https://www.remotion.dev/) 4 - browser-based video rendering
- [Vite](https://vitejs.dev/) 6
- [TypeScript](https://www.typescriptlang.org/) 5
- [i18next](https://www.i18next.com/) + [react-i18next](https://react.i18next.com/) - i18n

## Getting Started

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

The output in `dist/` is a static site deployable to any static hosting service.

## Usage

1. Upload a song file (.mp3)
2. Upload a lyric file (.lrc)
3. Upload a background image
4. Choose aspect ratio (9:16 / 16:9), visual style (Normal / Pixel), and dynamic effect (Ripple / Snow / None)
5. Preview in real-time while configuring
6. Click **Render** to render and download MP4

## Style Guide

### Aspect Ratio

| Ratio | Use Case |
|---|---|
| 9:16 | Short videos, phone wallpapers |
| 16:9 | Landscape videos, desktop wallpapers |

### Visual Style

| Style | Description |
|---|---|
| Normal | Modern lyric display with smooth animations |
| Pixel | Pixelated retro style, 8-bit visual experience |

### Dynamic Effect

| Effect | Description |
|---|---|
| Ripple | Ripple diffusion overlay on background image |
| Snow | Falling snow overlay on background image |
| None | Static blurred background |

## Export Settings

| Option | Values |
|---|---|
| Speed | Slow (HD) / Medium / Fast |
| Segment | First 15s / First 30s / Full |
| Video Codec | H.264 |
| Audio Codec | AAC |
| Container | MP4 |
| FPS | 30 |

## License

MIT
