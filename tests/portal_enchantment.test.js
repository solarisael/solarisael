import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { create_portal_enchantment } from "../src/scripts/portal_enchantment.js";

if (!globalThis.window)
  GlobalRegistrator.register({ url: "https://solarisael.local/" });

let menu, controller, motion, fonts, load_fonts, spies, hidden_descriptor;
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  hidden_descriptor = Object.getOwnPropertyDescriptor(document, "hidden");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  motion = new EventTarget();
  motion.matches = false;
  spies = [
    spyOn(globalThis, "matchMedia").mockReturnValue(motion),
    spyOn(console, "warn").mockImplementation(() => {}),
  ];
  menu = document.createElement("div");
  menu.dataset.sideMenuOpen = "false";
  menu.dataset.portalPhase = "closed";
  menu.dataset.sideMenuView = "root";
  menu.innerHTML = `<sol-obsidian-tablet><div>
    <div data-portal-glyphs aria-hidden="true"></div>
    <button data-side-menu-close aria-label="Close menu"></button>
    <a href="/writing" data-side-menu-route>
      <span data-inscription-text>writing</span>
    </a>
  </div></sol-obsidian-tablet>`;
  document.body.append(menu);
  fonts = Promise.withResolvers();
  load_fonts = mock(() => fonts.promise);
});

afterEach(async () => {
  controller?.dispose();
  controller = null;
  menu.remove();
  await settle();
  spies.forEach((spy) => spy.mockRestore());
  if (hidden_descriptor)
    Object.defineProperty(document, "hidden", hidden_descriptor);
  else delete document.hidden;
});

const open = async () => {
  menu.dataset.sideMenuOpen = "true";
  menu.dataset.portalPhase = "artifact";
  await settle();
};

test("fonts wait for an open artifact and late readiness cannot revive a closed menu", async () => {
  controller = create_portal_enchantment(menu, { load_fonts });
  expect(load_fonts).not.toHaveBeenCalled();
  await open();
  expect(load_fonts).toHaveBeenCalledTimes(1);
  menu.dataset.sideMenuOpen = "false";
  fonts.resolve();
  await settle();
  expect(menu.dataset.portalEnchantment).toBe("quiet");
  expect(menu.querySelector("[data-inscription-text]").textContent).toBe(
    "writing",
  );
  await open();
  expect(menu.dataset.portalEnchantment).toBe("active");
  expect(load_fonts).toHaveBeenCalledTimes(1);
});

test("depth glyphs and close-rim motes remain decorative and dispose without accumulation", async () => {
  controller = create_portal_enchantment(menu, { load_fonts });
  expect(
    menu.querySelectorAll("[data-glyph-depth=near]").length,
  ).toBeGreaterThan(0);
  expect(
    menu.querySelectorAll("[data-glyph-depth=far]").length,
  ).toBeGreaterThan(0);
  expect(menu.querySelectorAll(".sol__letter_bleed").length).toBeGreaterThan(0);
  expect(
    menu.querySelector(".sol__enchantment_letters").getAttribute("aria-hidden"),
  ).toBe("true");
  expect(menu.querySelector("[data-inscription-text]").textContent).toBe(
    "writing",
  );
  controller.dispose();
  expect(menu.querySelectorAll(".sol__enchanted_glyph").length).toBe(0);
  expect(menu.querySelector(".sol__enchantment_letters")).toBeNull();
  expect(menu.hasAttribute("data-portal-enchantment")).toBe(false);
  fonts.resolve();
  await settle();
  expect(menu.hasAttribute("data-portal-enchantment")).toBe(false);
});

test("reduced motion avoids fonts and gathers, then permits a normal-motion reveal", async () => {
  motion.matches = true;
  controller = create_portal_enchantment(menu, { load_fonts });
  await open();
  expect(menu.dataset.portalEnchantment).toBe("quiet");
  expect(load_fonts).not.toHaveBeenCalled();
  motion.matches = false;
  motion.dispatchEvent(new Event("change"));
  fonts.resolve();
  await settle();
  expect(menu.dataset.portalEnchantment).toBe("active");
  motion.matches = true;
  motion.dispatchEvent(new Event("change"));
  expect(menu.dataset.portalEnchantment).toBe("quiet");
  expect(menu.querySelector("[data-inscription-text]").textContent).toBe(
    "writing",
  );
});

test("settings and hidden document quiet the glyph field", async () => {
  controller = create_portal_enchantment(menu, { load_fonts });
  await open();
  fonts.resolve();
  await settle();
  menu.dataset.sideMenuView = "settings";
  await settle();
  expect(menu.dataset.portalEnchantment).toBe("quiet");
  menu.dataset.sideMenuView = "root";
  await settle();
  expect(menu.dataset.portalEnchantment).toBe("active");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
  expect(menu.dataset.portalEnchantment).toBe("quiet");
});

test("font failure leaves readable links and does not retry on every state change", async () => {
  controller = create_portal_enchantment(menu, { load_fonts });
  await open();
  fonts.reject(new Error("font unavailable"));
  await settle();
  expect(menu.dataset.portalEnchantment).toBe("quiet");
  menu.dataset.sideMenuView = "settings";
  await settle();
  menu.dataset.sideMenuView = "root";
  await settle();
  expect(load_fonts).toHaveBeenCalledTimes(1);
  expect(menu.querySelector("a").getAttribute("href")).toBe("/writing");
  expect(menu.querySelector("[data-inscription-text]").textContent).toBe(
    "writing",
  );
});
