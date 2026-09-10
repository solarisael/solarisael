import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { create_inscription } from "../src/scripts/inscription.js";
import { clearCache } from "@chenglou/pretext";
import { define_inscription_element } from "../src/scripts/inscription_element.js";
const original_offscreen_canvas = globalThis.OffscreenCanvas;

if (!globalThis.window)
  GlobalRegistrator.register({ url: "https://solarisael.local/" });

let menu, frames, now, next_id, motion, spies, hidden_descriptor;
const labels = () => [...menu.querySelectorAll("[data-inscription-text]")];
const advance = (time) => {
  now = time;
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(time));
};

beforeEach(() => {
  hidden_descriptor = Object.getOwnPropertyDescriptor(document, "hidden");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  frames = new Map();
  now = 0;
  next_id = 0;
  motion = new EventTarget();
  motion.matches = false;
  globalThis.OffscreenCanvas = class {
    getContext() {
      return {
        font: "",
        measureText: (text) => ({ width: String(text).length * 10 }),
      };
    }
  };
  spies = [
    spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: (text) => ({ width: String(text).length * 10 }),
    }),
    spyOn(globalThis, "requestAnimationFrame").mockImplementation(
      (callback) => {
        frames.set(++next_id, callback);
        return next_id;
      },
    ),
    spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) =>
      frames.delete(id),
    ),
    spyOn(globalThis, "matchMedia").mockReturnValue(motion),
    spyOn(performance, "now").mockImplementation(() => now),
    spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      array[0] = 12345;
      return array;
    }),
  ];
  clearCache();
  define_inscription_element();
  menu = document.createElement("div");
  menu.dataset.sideMenuOpen = "true";
  menu.innerHTML =
    '<a class="sol__side_menu_route"><span><sol-inscription manual><span class="sr-only">Writing Gate</span><span data-inscription-text aria-hidden="true">Writing Gate</span></sol-inscription></span><small>Read here</small></a><a class="sol__side_menu_route"><span><sol-inscription manual><span class="sr-only">Work</span><span data-inscription-text aria-hidden="true">Work</span></sol-inscription></span></a>';
  document.body.append(menu);
});

afterEach(() => {
  menu.remove();
  globalThis.OffscreenCanvas = original_offscreen_canvas;
  spies.forEach((spy) => spy.mockRestore());
  if (hidden_descriptor)
    Object.defineProperty(document, "hidden", hidden_descriptor);
  else delete document.hidden;
});

test("standalone wrappers animate from keyboard focus and reconnect without stale frames", () => {
  const button = document.createElement("button");
  button.innerHTML =
    '<sol-inscription><span class="sr-only">Little gate</span><span data-inscription-text aria-hidden="true">Little gate</span></sol-inscription>';
  menu.append(button);
  const visual = button.querySelector("[data-inscription-text]");
  button.dispatchEvent(new Event("focusin", { bubbles: true }));
  advance(0);
  expect(visual.textContent).not.toBe("Little gate");
  expect(button.querySelector(".sr-only").textContent).toBe("Little gate");
  const stale = [...frames.values()][0];
  button.remove();
  expect(visual.textContent).toBe("Little gate");
  expect(frames.size).toBe(0);
  menu.append(button);
  button.dispatchEvent(new Event("focusin", { bubbles: true }));
  advance(45);
  const current = visual.textContent;
  stale(400);
  expect(visual.textContent).toBe(current);
  advance(405);
  expect(visual.textContent).toBe("Little gate");
  expect(frames.size).toBe(0);
});

test("standalone wrappers keep their original text under reduced motion", () => {
  motion.matches = true;
  const button = document.createElement("button");
  button.innerHTML =
    '<sol-inscription><span class="sr-only">Quiet gate</span><span data-inscription-text aria-hidden="true">Quiet gate</span></sol-inscription>';
  menu.append(button);
  button.dispatchEvent(new Event("focusin", { bubbles: true }));
  advance(0);
  expect(button.querySelector("[data-inscription-text]").textContent).toBe(
    "Quiet gate",
  );
  expect(button.querySelector(".sr-only").textContent).toBe("Quiet gate");
  expect(frames.size).toBe(0);
});

test("custom enchanted alphabets preserve supplementary Unicode glyphs", () => {
  const label = labels()[0];
  const original = label.textContent;
  const glyphs = ["ᚠ", "🜁", "🜂"];
  const inscription = create_inscription(label, { glyphs });
  inscription.reveal();
  advance(0);
  const symbols = [...label.textContent].filter(
    (letter) => !/\s/u.test(letter),
  );
  expect(symbols.length).toBe(
    [...original].filter((letter) => !/\s/u.test(letter)).length,
  );
  expect(symbols.every((letter) => glyphs.includes(letter))).toBe(true);
  inscription.dispose();
  expect(label.textContent).toBe(original);
});
