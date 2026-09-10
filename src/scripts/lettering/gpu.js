import source from "../../shaders/portal_lettering.wgsl";

const make_resources = (api, StorageBuffer, gpu, model, frame) => {
  const resources = [];
  const buffer = (data, label) => {
    const value = new StorageBuffer(gpu.device, {
      size: data.byteLength,
      label,
      visibility: GPUShaderStage.VERTEX,
    });
    resources.push(value);
    value.write(data);
    return value;
  };
  const dispose = () => {
    for (const resource of resources) resource.dispose();
  };
  try {
    const actors = buffer(model.actor_data, "lettering-actors");
    const entries = buffer(model.atlas.data, "lettering-glyph-metrics");
    const words = buffer(model.word_data, "lettering-word-states");
    const { width, height, pixels } = model.atlas;
    const texture = gpu.device.createTexture({
      size: [width, height],
      format: "rgba8unorm",
      usage: ["texture_binding", "copy_dst"],
      label: "lettering-glyph-atlas",
    });
    resources.push(texture);
    gpu.gpu.queue.writeTexture(
      { texture: texture.gpu },
      pixels,
      { bytesPerRow: width * 4, rowsPerImage: height },
      { width, height },
    );
    const draw = api.draw(gpu, {
      shader: source,
      label: "portal-lettering",
      vertices: 6,
      instances: model.count,
      blend: "premultiplied",
      depth: false,
      set: {
        frame,
        actors,
        entries,
        words,
        glyph_texture: texture,
        glyph_sampler: api.sampler(gpu, {
          minFilter: "linear",
          magFilter: "linear",
        }),
      },
    });
    return { draw, dispose, actors, words };
  } catch (error) {
    dispose();
    throw error;
  }
};

export const create_lettering_gpu = async (canvas, on_error) => {
  const [api, { StorageBuffer }] = await Promise.all([
    import("vgpu"),
    import("vgpu/core"),
  ]);
  const gpu = await api.init();
  let surface,
    current,
    disposed = false,
    failure = null;
  const fail = (error) => {
    if (disposed) return;
    failure = error;
    on_error(error);
  };
  const remove_error = gpu.onError(fail);
  gpu.gpu.lost.then(fail);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    remove_error();
    current?.dispose();
    surface?.dispose();
    gpu.dispose();
  };
  try {
    surface = api.surface(gpu, canvas, {
      dpr: [1, 1.25],
      alphaMode: "premultiplied",
      clearColor: [0, 0, 0, 0],
    });
  } catch (error) {
    dispose();
    throw error;
  }
  const uniforms = { frame: null };
  const submit = (frame) => frame.pass(surface, current.draw);
  return {
    async prepare(model, frame) {
      const next = make_resources(api, StorageBuffer, gpu, model, frame);
      try {
        await next.draw.compile({
          colors: [navigator.gpu.getPreferredCanvasFormat()],
        });
        await gpu.settled();
        if (failure) throw failure;
        if (disposed)
          throw new Error("Lettering GPU was disposed during preparation.");
      } catch (error) {
        next.dispose();
        throw error;
      }
      current?.dispose();
      current = next;
    },
    update_layout(model) {
      current.actors.write(model.actor_data);
    },
    update_words(model) {
      current.words.write(model.word_data);
    },
    render(frame) {
      if (disposed || failure)
        throw new Error("The lettering GPU is unavailable.");
      uniforms.frame = frame;
      current.draw.set(uniforms);
      api.frame(gpu, submit);
    },
    dispose,
  };
};
