import { RUNIC_GLYPHS, SYMBOL_GLYPHS } from "../enchantment_glyphs.js";

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const seeds = new WeakMap();
const alphabet = [
  ...RUNIC_GLYPHS.map((text) => ({ text, family: "Solarisael Runic" })),
  ...SYMBOL_GLYPHS.map((text) => ({ text, family: "Solarisael Symbols" })),
];

const transform_text = (text, transform) => {
  if (transform === "uppercase") return text.toLocaleUpperCase();
  if (transform === "lowercase") return text.toLocaleLowerCase();
  return text;
};

const read_group = (link, index, root_size) => {
  const label = link.querySelector("[data-inscription-text]");
  const style = getComputedStyle(label);
  const size = Number.parseFloat(style.fontSize);
  if (!seeds.has(link)) seeds.set(link, Math.floor(Math.random() * 1000000));
  return {
    link,
    label,
    index,
    root_size,
    size,
    seed: seeds.get(link),
    font: `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`,
    segments: [...segmenter.segment(label.textContent)].map((part) => ({
      text: transform_text(part.segment, style.textTransform),
      start: part.index,
      end: part.index + part.segment.length,
    })),
  };
};

export const lettering_signature = (menu) =>
  [...menu.querySelectorAll(".sol__side_menu_route [data-inscription-text]")]
    .map((label) => {
      const style = getComputedStyle(label);
      return [
        label.textContent,
        style.font,
        style.letterSpacing,
        style.textTransform,
      ].join("|");
    })
    .join("\n") + getComputedStyle(document.documentElement).fontSize;

export const create_font_plan = (menu) => {
  const root_size = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  const groups = [...menu.querySelectorAll("[data-side-menu-route]")].map(
    (link, index) => read_group(link, index, root_size),
  );
  const requests = new Map();
  const register = (category, text, font, glowSmall, glowWide, outline) => {
    const key = `${category}|${font}|${text}`;
    if (!requests.has(key))
      requests.set(key, { key, text, font, glowSmall, glowWide, outline });
    return key;
  };
  const glyph_keys = (category, size, small, wide, outline) =>
    alphabet.map(({ text, family }) =>
      register(category, text, `${size}px "${family}"`, small, wide, outline),
    );
  for (const group of groups) {
    for (const part of group.segments) {
      part.key = register(
        "letter",
        part.text,
        group.font,
        root_size * 0.22,
        root_size * 0.8,
        1,
      );
    }
    group.alternates = glyph_keys(
      "alternate",
      group.size,
      root_size * 0.22,
      root_size * 0.8,
      1,
    );
    group.particles = glyph_keys(
      "particle",
      Math.max(group.size * 0.32, root_size * 0.8),
      root_size * 0.25,
      root_size * 0.65,
      0,
    );
  }
  return { groups, requests: [...requests.values()] };
};
