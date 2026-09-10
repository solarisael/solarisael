# UI Option Classes

This file is the single registry for switchable UI class options.

When new optional class variants are introduced, add them here in the same change.

## Changelog

- 2026-02-08: Added initial registry with `navbar-preset-*`,
  `route-active-tone-*`, and `page-transition-breath-*` option sets.
- 2026-02-08: Added `home_theme_*` and `home_fx_*` option sets for `/` card-gate visuals.
- 2026-02-08: Migrated `home_theme_*` to `site_theme_*` and `home_fx_*` to `site_fx_*` for global naming.
- 2026-02-08: Added `site_shell_*` option set for shell intensity control.
- 2026-02-08: Added `verdigris` to `data-site-theme` options.
- 2026-02-09: Replaced 4 theme options with 7 inspiration-aligned themes and dual alias naming.

## Navigation

The side menu supplies site navigation at every viewport width.
Use `#sol_side_menu_trigger` to open the menu.
The site has no top navbar or navbar preset classes.

The cog opens Site configuration.
The hooded figure opens Your profile, with reading preferences and local profile details.
Each reset changes only the preferences in its own panel.
Back and Escape return focus to the icon that opened the panel.

Button surfaces share the obsidian shader, canvas, and lighting fields.
The controls stay native HTML buttons.
Without WebGPU, the buttons use a flat dark background.

Mark buttons with `data-obsidian-button` before the tablet runtime starts.
The shader supports 16 visible buttons within the tablet's scroll area.
Each surface ends two CSS pixels inside its button bounds.
The runtime updates geometry when the panel, scroll position, fonts, or layout changes.

Menu labels remain ordinary HTML text.
One foreground WebGPU canvas renders their animated letters, gathering glyphs, and particle trails.
Ambient water glyphs and close-button motes keep their existing DOM renderer.

Glyph atlases rebuild when text or fonts change.
Layout changes update glyph positions from the existing text nodes.
Animation frames update GPU time without creating or changing per-letter DOM elements.
Closed menus, hidden tabs, and reduced motion stop foreground draws.
Font or GPU failures keep the native text readable.

## Page Transition Breath

- Purpose: controls fade-out -> gap -> fade-in timing between page swaps.
- Apply on: `body` in `src/layouts/index.astro`.
- Default: `page-transition-breath-subtle`.
- Options:
  - `page-transition-breath-subtle`
  - `page-transition-breath-noticeable`

Quick switch:

```html
<body class="page-transition-breath-subtle" ...></body>
```

## Add New Option Sets

For each new option set, document:

1. Purpose
2. Where to apply the class
3. Default class
4. Full options list
5. One-line quick switch example

## Text Effects

- Purpose: inline visual emphasis that follows global `data-site-fx` intensity.
- Apply on: inline `span` elements only.
- Base class: `text_fx`.
- Effect classes:
  - `text_fx_glow`
  - `text_fx_neon`
  - `text_fx_shadow`
  - `text_fx_chroma`
  - `text_fx_blur`
  - `text_fx_flicker`
  - `text_fx_rainbow`
  - `text_fx_gradient`
  - `text_fx_aura`
  - `text_fx_etch`
  - `text_fx_whisper`
  - `text_fx_sigil_pulse`
  - `text_fx_veil`
  - `text_fx_cadence`
  - `text_fx_cadence_soft`
  - `text_fx_cadence_oracular`
  - `text_fx_cadence_childlike`
  - `text_fx_wiggle`
  - `text_fx_float`
  - `text_fx_shake`
  - `text_fx_glitch`

Quick switch:

```html
<span class="sol__text_fx sol__text_fx_glow">luminous text</span>
```

Markdown marker (Obsidian flow):

```md
{{fx:glow}}luminous text{{/fx}}
{{fx:glow:1.4}}luminous text (visual only){{/fx}}
{{fx:flicker:1.2:0.8}}fading signal (visual + motion){{/fx}}
{{fx:glow|flicker|shadow:1.2:0.9}}stacked signal (left-to-right){{/fx}}
{{fx:aura:1.5}}consecrated phrase{{/fx}}
{{fx:sigil_pulse:1.4:1.1}}warding phrase{{/fx}}
{{fx:cadence_oracular:1.1}}inner vow{{/fx}}
```

- Marker syntax: `{{fx:effect_name[|effect_name...][:visual_intensity][:motion_intensity]}}...{{/fx}}`
- Stack policy: text effects only, evaluated left-to-right.
- Sanitization policy: blacklisted stack pairs auto-drop later tokens and emit build/dev warnings.
- Intensity range: `0.2` -> `3` (runtime-clamped)
- Coverage rule: every registered effect must appear in at least one sandbox page (`src/pages/codex/labs/test-texts.md` or `src/pages/codex/labs/test-overlays.md`).

## Block Effects

- Purpose: full-width in-prose overlays for LitRPG system layers.
- Apply on: wrapper `div` generated from standalone marker pairs.
- Base class: `block_fx`.
- Effect classes:
  - `block_fx_terminal`
  - `block_fx_stat_screen`
  - `block_fx_game_screen`
  - `block_fx_quest_log`
  - `block_fx_skill_popup`
  - `block_fx_inventory`
  - `block_fx_combat_feed`
  - `block_fx_status_effects`
  - `block_fx_system_warning`
  - `block_fx_memory_fragment`
  - `block_fx_admin_trace`
  - `block_fx_party_roster`
  - `block_fx_map_ping`

Markdown marker (Obsidian flow):

```md
{{fx:terminal:1.2:0.9}}
[SYSTEM] Awaiting input.
{{/fx}}

{{fx:stat_screen:1.1}}

- HP: 100/100
- MP: 62/62
  {{/fx}}

{{fx:game_screen:1.2}}
**Milestone Quest Received**

- Objective A // 0%
  {{/fx}}

{{fx:quest_log:1.25}}
**Active Quests**

- [Main] Descend alive // 0%
  {{/fx}}

{{fx:system_warning:1.2}}
**CAUTION: ACCESS INSTABILITY DETECTED**
{{/fx}}
```

- Block wrapper element: `div`
- Marker syntax: `{{fx:block_effect[:visual_intensity][:motion_intensity]}} ... {{/fx}}`
- Intensity range: `0.2` -> `3` (runtime-clamped)
- Coverage rule: every registered effect must appear in at least one sandbox page (`src/pages/codex/labs/test-texts.md` or `src/pages/codex/labs/test-overlays.md`).

## Site Theme

- Purpose: controls global site visual language aligned to inspiration families with dual alias names.
- Apply on: `html` via `data-site-theme` and globally via style switcher cookies.
- Default: `minimal_astral`.
- Options:
  - `minimal_astral` (`astrology_themed`) - clean celestial linework
  - `gilded_arcane` (`golden_mystical_tarot`) - ornate black-gold tarot
  - `cosmic_overlay` (`cosmic_themed`) - orbital cosmic layouts
  - `witchy_ornate` (`wicca_ornamentation`) - decorative occult motifs
  - `graveyard_gothic` (`gothic_dark_girl`) - dark feminine collage
  - `pixel_relic` (`relic_gothic`) - retro relic HUD
  - `grimdark_tarot` (`grimdark_tarot`) - moody narrative tarot

Quick switch:

```html
<html data-site-theme="minimal_astral"></html>
```

## Site Effects Intensity

- Purpose: controls content emphasis intensity (text/border/interactions + non-shell motion) independent of theme.
- Apply on: `html` via `data-site-fx` and globally via style switcher cookies.
- Default: `balanced`.
- Options:
  - `subtle`
  - `balanced`
  - `bold`

Quick switch:

```html
<html data-site-fx="bold"></html>
```

## Site Shell Strength

- Purpose: controls page/chrome container intensity (surfaces/backgrounds/blur/shell glow/decorative overlays).
- Apply on: `html` via `data-site-shell` and style switcher cookies.
- Default: `medium`.
- Options:
  - `subtle`
  - `medium`
  - `strong`

Quick switch:

```html
<html data-site-shell="strong"></html>
```

## Display Tuning

- Purpose: keep the obsidian rim, water, and ink distinct on SDR displays.
- Apply on: `html` through `data-site-display`.
- Default: `sdr`.
- Options:
  - `sdr`: blend shader lighting toward sRGB encoding, with a restrained lift for dark detail.
  - `hdr`: keep the original darker grade that Sol tuned with Windows HDR enabled.
- Storage: the `site_display` cookie keeps the selection for 180 days.
- Control: use Display tuning in Site configuration.
- Reset: Reset site configuration restores `sdr`.

Both profiles use standard-range canvas output.
The HDR profile does not enable extended-range output or change system settings.
The SDR profile blends 42% toward sRGB encoding before alpha multiplication at the canvas boundary.
This artistic grade maps an original channel value of 1/255 to approximately 6/255.
The lift is `0.42` in both `obsidian_glass.wgsl` and `portal_ink.wgsl`.

Intermediate lighting fields stay unchanged.
Static obsidian colors follow the selected profile when WebGPU is unavailable.

Use the control to save a selection.
Use this attribute for a temporary visual check:

```html
<html data-site-display="sdr"></html>
```
