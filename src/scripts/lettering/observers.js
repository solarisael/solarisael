export const observe_lettering = (menu, canvas, layout, states) => {
  const invalidate = () => layout();
  const fonts = () => layout(true);
  const selection = () => queueMicrotask(states);
  const resize = new ResizeObserver(invalidate);
  resize.observe(canvas);
  const text = new MutationObserver(invalidate);
  const selection_changes = new MutationObserver(states);
  for (const link of menu.querySelectorAll("[data-side-menu-route]")) {
    const label = link.querySelector("[data-inscription-text]");
    resize.observe(label);
    text.observe(label, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    selection_changes.observe(link, {
      attributes: true,
      attributeFilter: ["data-route-active", "data-portal-selected"],
    });
  }
  const appearance = new MutationObserver(invalidate);
  appearance.observe(document.documentElement, {
    attributes: true,
    attributeFilter: [
      "data-site-scale",
      "data-user-text",
      "data-user-measure",
      "data-site-theme",
    ],
  });
  menu.addEventListener("scroll", invalidate, true);
  menu.addEventListener("pointerout", selection);
  menu.addEventListener("focusout", selection);
  document.fonts.addEventListener("loadingdone", fonts);
  return () => {
    resize.disconnect();
    text.disconnect();
    selection_changes.disconnect();
    appearance.disconnect();
    menu.removeEventListener("scroll", invalidate, true);
    menu.removeEventListener("pointerout", selection);
    menu.removeEventListener("focusout", selection);
    document.fonts.removeEventListener("loadingdone", fonts);
  };
};
