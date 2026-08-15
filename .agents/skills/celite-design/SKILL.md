---
name: celite-design
description: Apply and build UI using the official Celite Design Theme (obsidian dark base, floating glowing blue borders, ambient radial flares, feathered image masks, and crisp white typography).
---

<!-- agent-notes: { ctx: "Celite official design system specification and skill guide", deps: [components/Hero.tsx, docs/code-map.md], state: active, last: "dani@2026-08-15" } -->

# Celite Design Theme System Guide (`/celite-design`)

This skill defines the signature visual language, token recipes, and component architecture for the **Celite Digital Assets Marketplace**.

---

## 🌌 Core Aesthetic Philosophy

The Celite Theme is an ultra-premium, high-converting digital storefront design language built on:
1. **Obsidian / Dark Base**: Rich multi-stop dark tones (`#0d0f17` → `#0a0b10` → `#07080c`), avoiding flat muddy grays.
2. **Floating Blue Accents & Borders**: Delicate semi-transparent royal and electric blue borders (`border-blue-500/30`), subtle hairline top highlights, and floating blue aura drop-shadows.
3. **Atmospheric Ambient Light**: Layered, low-opacity radial blur orbs (`blur-[80px]`–`blur-[90px]`) that give depth without washing out the text.
4. **Feathered Multi-Stop Masks**: CSS `[mask-image:linear-gradient(...)]` that seamlessly dissolves imagery into the dark background without harsh seams.
5. **Crisp High-Contrast Typography**: Pure white (`text-white`) bold headers (`font-[900] tracking-tight`), glassmorphic badge pills with glowing status pulses, and refined tag pills.

---

## 🎨 Design Tokens & Class Recipes

### 1. Main Container Base & Floating Blue Glow
```tsx
<div className="relative bg-gradient-to-br from-[#0d0f17] via-[#0a0b10] to-[#07080c] rounded-[1.5rem] overflow-hidden border border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)] group">
  {/* Top Subtle Floating Blue Glow Line */}
  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/60 to-transparent pointer-events-none" />

  {/* Delicate Floating Blue Ambient Light Orbs */}
  <div className="absolute -top-20 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-[90px] pointer-events-none" />
  <div className="absolute -bottom-24 right-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />
  
  {/* Content goes here */}
</div>
```

### 2. Smooth Feathered Image Mask
Use multi-stop linear gradient alpha masks instead of flat opacity overlays:
```tsx
<div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
  <div className="absolute inset-y-0 right-0 w-full md:w-3/5 h-full [mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.2)_20%,rgba(0,0,0,0.75)_55%,black_90%)] md:[mask-image:linear-gradient(to_right,transparent_0%,rgba(0,0,0,0.35)_30%,black_80%)]">
    <img
      src="/asset-preview.png"
      alt="Preview"
      className="w-full h-full object-cover object-center md:object-right opacity-80 md:opacity-95"
    />
    {/* Soft dark vignette */}
    <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f17] via-transparent to-transparent opacity-40" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#07080c]/90 via-transparent to-transparent md:hidden" />
  </div>
</div>
```

### 3. Glassmorphic Pill Badge with Glowing Indicator
```tsx
<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.07] backdrop-blur-md border border-blue-400/20 text-blue-200 text-xs font-medium mb-4 w-fit shadow-sm">
  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] animate-pulse" />
  <span>Curated Digital Marketplace</span>
</div>
```

### 4. High-Impact Typography & Feature Tags
```tsx
{/* Title */}
<h1 className="text-4xl sm:text-5xl md:text-6xl font-[900] tracking-tight text-white leading-[0.95] mb-4 drop-shadow-lg">
  CREATIVE <br className="hidden sm:block" />
  TEMPLATES
</h1>

{/* Description */}
<p className="text-base sm:text-lg md:text-xl font-medium text-white/90 leading-snug mb-3 drop-shadow-sm max-w-lg">
  Premium After Effects templates, stock music, and digital assets.
</p>

{/* Feature Tags */}
<div className="flex flex-wrap items-center gap-2 text-zinc-300 text-[11px] font-medium">
  <span className="bg-white/5 px-2.5 py-0.5 rounded border border-blue-500/20 text-white">
    Unlimited downloads
  </span>
  <span className="text-blue-400">•</span>
  <span>After Effects</span>
  <span className="text-blue-400">•</span>
  <span>Commercial License</span>
</div>
```

---

## 🛠️ When & How to Use `/celite-design`

When implementing or restyling components across Celite (heroes, promotion cards, modal popups, header highlights, CTA banners):
1. **Always use the Obsidian Base**: Never use default flat `#000000` or `#111827`. Use the multi-stop `#0d0f17` gradient.
2. **Apply Floating Blue Border**: Combine `border-blue-500/30` with `shadow-[0_0_50px_-15px_rgba(59,130,246,0.25)]` and top hairline accent.
3. **Layer Soft Ambient Light**: Keep opacity between 10%–20% with heavy blur (`blur-[80px]` or `blur-[90px]`).
4. **Feather Images**: Mask images smoothly using CSS gradient masks so text remains legible and imagery transitions without hard borders.
5. **Preserve High Readability**: Headers must be `text-white` with `font-[900]` or `font-black`.
