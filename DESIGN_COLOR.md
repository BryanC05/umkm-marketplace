# UMKM Marketplace - Design Color Palette

> This document defines the complete color system used across the UMKM Marketplace platform (Web Frontend & Mobile App).

---

## Brand Primary Color

The primary brand color is a **Teal/Cyan** that represents trust, growth, and modernity.

| Variant | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| **Primary** | `#14b8a6` | `#14b8a6` | Buttons, links, accents |
| **Primary Dark** | `#0f766e` | `#14b8a6` | Hover states, emphasis |
| **Primary Light** | `#ccfbf1` | `#134e4a` | Light backgrounds, badges |
| **Glow** | `rgba(20, 184, 166, 0.3)` | `rgba(20, 184, 166, 0.3)` | Glow effects, shadows |

**HSL Values:** `hsl(185 72% 48%)`

---

## Background Colors

### Light Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--background` | `#f0f3f8` | `210 20% 93%` | Page background |
| `--card` | `#ffffff` | `0 0% 100%` | Card surfaces |
| `--surface` | `#f1f5f9` | `210 20% 96%` | Elevated surfaces |
| `--surface-elevated` | `#ffffff` | `0 0% 100%` | Modals, popovers |
| `--input` | `#f1f5f9` | `210 20% 96%` | Input fields |
| `--sidebar-background` | `#f3f5f9` | `210 20% 96%` | Sidebar/navbar |

### Dark Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--background` | `#0d1117` | `222 30% 8%` | Page background |
| `--card` | `#161b22` | `222 25% 11%` | Card surfaces |
| `--surface` | `#1c2128` | `222 25% 12%` | Elevated surfaces |
| `--surface-elevated` | `#1c2128` | `222 25% 15%` | Modals, popovers |
| `--input` | `#1c2128` | `222 20% 18%` | Input fields |
| `--sidebar-background` | `#0a0d12` | `222 30% 6%` | Sidebar/navbar |

---

## Text Colors

### Light Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--foreground` | `#1a1f2e` | `215 25% 15%` | Primary text |
| `--muted-foreground` | `#64748b` | `215 15% 40%` | Secondary text |
| `--text-tertiary` | `#94a3b8` | `215 15% 60%` | Placeholder, hints |

### Dark Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--foreground` | `#e6eaef` | `210 20% 90%` | Primary text |
| `--muted-foreground` | `#94a3b8` | `215 15% 55%` | Secondary text |
| `--text-tertiary` | `#64748b` | `215 15% 40%` | Placeholder, hints |

---

## Border Colors

| Mode | Token | Hex | HSL |
|------|-------|-----|-----|
| Light | `--border` | `#dbe0e6` | `210 20% 82%` |
| Light | `--geometric-border` | `#8fb8bf` | `185 40% 70%` |
| Dark | `--border` | `#242c38` | `222 20% 18%` |
| Dark | `--geometric-border` | `#2d6b6b` | `185 40% 30%` |

---

## Semantic Colors

### Success (Green)

| Variant | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| **Success** | `#10b981` | `#34d399` | Success states, checkmarks |
| **Success Light** | `#ecfdf5` | `#064e3b` | Success backgrounds |

### Danger/Error (Red)

| Variant | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| **Destructive** | `#ef4444` | `#f87171` | Errors, deletions, alerts |
| **Destructive Foreground** | `#ffffff` | `#ffffff` | Text on destructive bg |
| **Danger Light** | `#fef2f2` | `#450a0a` | Error backgrounds |

### Warning (Amber)

| Variant | Light Mode | Dark Mode | Usage |
|---------|------------|-----------|-------|
| **Warning** | `#f59e0b` | `#fbbf24` | Warnings, cautions |
| **Warning Light** | `#fffbeb` | `#451a03` | Warning backgrounds |

---

## Secondary & Accent Colors

### Light Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--secondary` | `#dbe0e6` | `210 15% 85%` | Secondary buttons |
| `--secondary-foreground` | `#263145` | `215 25% 20%` | Text on secondary |
| `--muted` | `#dbe0e6` | `210 15% 88%` | Muted backgrounds |
| `--accent` | `#14b8a6` | `185 72% 48%` | Accent elements |

### Dark Mode

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| `--secondary` | `#242c38` | `222 20% 16%` | Secondary buttons |
| `--secondary-foreground` | `#d1d9e6` | `210 20% 85%` | Text on secondary |
| `--muted` | `#242c38` | `222 20% 16%` | Muted backgrounds |
| `--accent` | `#14b8a6` | `185 72% 48%` | Accent elements |

---

## Component-Specific Colors

### Popover/Dropdown

| Mode | Background | Foreground |
|------|------------|------------|
| Light | `#ffffff` | `#1a1f2e` |
| Dark | `#161b22` | `#e6eaef` |

### Sidebar

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Background | `#f3f5f9` | `#0a0d12` |
| Foreground | `#4a5568` | `#94a3b8` |
| Primary | `#14b8a6` | `#14b8a6` |
| Accent | `#e8ecf2` | `#1c2128` |
| Border | `#e2e8f0` | `#242c38` |

---

## Color Usage Guidelines

### Do's
- Use `--primary` for primary actions (CTA buttons, key links)
- Use `--success` for positive feedback and confirmations
- Use `--destructive` for destructive actions (delete, remove)
- Use `--warning` for cautionary messages
- Maintain consistent contrast ratios (WCAG 4.5:1 minimum)

### Don'ts
- Don't use pure black (`#000000`) or pure white (`#ffffff`) except for specific cases
- Don't introduce new colors without updating this document
- Don't mix light and dark mode colors in the same view

---

## Platform Implementation

### Web Frontend (Tailwind CSS)

Colors are defined in:
- [`frontend/src/index.css`](frontend/src/index.css) - CSS custom properties
- [`frontend/tailwind.config.js`](frontend/tailwind.config.js) - Tailwind theme extension
- [`frontend/src/new-ui-index.css`](frontend/src/new-ui-index.css) - Alternative theme

### Mobile App (React Native)

Colors are defined in:
- [`mobile/src/store/themeStore.js`](mobile/src/store/themeStore.js) - Theme store with light/dark colors
- [`mobile/src/theme/tokens.js`](mobile/src/theme/tokens.js) - Design tokens

---

## Color Accessibility

All color combinations meet WCAG 2.1 AA standards:
- Primary text on background: 4.5:1 minimum
- Large text on background: 3:1 minimum
- Interactive elements: 3:1 minimum against adjacent colors

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-03-04 | Initial color palette documentation | System |

---

*For questions or updates to this color palette, please consult the design team.*
