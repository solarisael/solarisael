import { build_glyph_atlas } from "./atlas.js";
import { create_font_plan, lettering_signature } from "./font_plan.js";
import { create_text_model } from "./model.js";
import { observe_lettering } from "./observers.js";

const load_gpu = async (canvas, on_error) => {
  const { create_lettering_gpu } = await import("./gpu.js");
  return create_lettering_gpu(canvas, on_error);
};

export const create_portal_lettering = (menu) => {
  const canvas = menu.querySelector("[data-portal-lettering]");
  const scrollport = menu.querySelector("#sol_side_menu_panel_scroll");
  const values = {
    resolution: [1, 1],
    time: 0,
    padding: 0,
    clip: [0, 0, 1, 1],
  };
  let backend = null,
    model = null,
    frame = null,
    last = null;
  let shown = false,
    disposed = false,
    failed = false,
    pending = false;
  let dirty = true,
    pending_reveal = true,
    signature = "",
    font_epoch = 0;
  let elapsed = 0,
    painted = false;
  const active = () => shown && !disposed && !failed;
  const current_signature = () => `${lettering_signature(menu)}:${font_epoch}`;
  const cancel = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    last = null;
  };
  const restore = () => {
    shown = false;
    painted = false;
    cancel();
    menu.dataset.letteringRenderer = "static";
  };
  const fail = (error) => {
    if (failed || disposed) return;
    failed = true;
    restore();
    backend?.dispose();
    console.warn(
      "GPU lettering unavailable; the menu keeps its native text.",
      error,
    );
  };
  const request = () => {
    if (!active() || pending || frame !== null) return;
    frame = requestAnimationFrame(draw);
  };
  const initialize = async () => {
    if (backend) return;
    if (!navigator.gpu) throw new Error("WebGPU is unavailable.");
    const loaded = await load_gpu(canvas, fail);
    if (disposed || failed) {
      loaded.dispose();
      return;
    }
    backend = loaded;
  };
  const prepare = async () => {
    if (pending || !active()) return;
    pending = true;
    painted = false;
    menu.dataset.letteringRenderer = "loading";
    try {
      await initialize();
      if (!active()) return;
      const next_signature = current_signature();
      const plan = create_font_plan(menu);
      const atlas = build_glyph_atlas(plan.requests);
      const next = create_text_model(plan, atlas, model);
      next.measure(canvas, scrollport, values);
      await backend.prepare(next, values);
      if (disposed || failed) return;
      next.atlas.pixels = null;
      model = next;
      signature = next_signature;
      dirty = true;
      last = null;
    } catch (error) {
      fail(error);
    } finally {
      pending = false;
      request();
    }
  };
  const update_layout = () => {
    model.measure(canvas, scrollport, values);
    backend.update_layout(model);
    dirty = false;
  };
  function draw(now) {
    frame = null;
    if (!active()) return;
    if (last !== null && now - last < 1000 / 30) {
      request();
      return;
    }
    if (!model || (dirty && signature !== current_signature())) {
      void prepare();
      return;
    }
    try {
      if (dirty) update_layout();
      if (last !== null) elapsed += (now - last) / 1000;
      last = now;
      values.time = elapsed;
      if (pending_reveal) {
        model.reveal(elapsed);
        model.sync_states();
        backend.update_words(model);
        pending_reveal = false;
      }
      backend.render(values);
      if (!painted) {
        menu.dataset.letteringRenderer = "webgpu";
        painted = true;
      }
    } catch (error) {
      fail(error);
    }
    request();
  }
  const invalidate = (fonts = false) => {
    dirty = true;
    if (fonts) font_epoch++;
    request();
  };
  const sync_states = () => {
    if (!active() || !model || pending) return;
    if (model.sync_states()) backend.update_words(model);
  };
  const stop_observing = observe_lettering(
    menu,
    canvas,
    invalidate,
    sync_states,
  );
  restore();
  return {
    show() {
      if (disposed || failed) return;
      shown = true;
      dirty = true;
      pending_reveal = true;
      request();
    },
    reveal(route) {
      if (!active() || !model || pending) return;
      const changed = model.reveal(elapsed, route);
      if (model.sync_states() || changed) backend.update_words(model);
    },
    restore,
    dispose() {
      if (disposed) return;
      restore();
      disposed = true;
      stop_observing();
      backend?.dispose();
      model = null;
      delete menu.dataset.letteringRenderer;
    },
  };
};
