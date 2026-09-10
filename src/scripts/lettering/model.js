const random = (seed) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

const make_records = (groups) => {
  const layers = [[], [], []];
  for (const group of groups) {
    group.segments.forEach((part, index) => {
      part.ordinal = index;
      part.box = [0, 0, 0, 0];
      if (/\s/u.test(part.text)) return;
      layers[0].push({ group, part, kind: 0, phase: 0 });
      layers[1].push(
        { group, part, kind: 3, phase: 0 },
        { group, part, kind: 3, phase: 0.5 },
      );
      layers[2].push(
        { group, part, kind: 1, phase: 0 },
        { group, part, kind: 2, phase: 0 },
      );
    });
  }
  return layers.flat();
};

const seed_actors = (records, entries, data) => {
  records.forEach(({ group, part, kind, phase }, index) => {
    const seed = group.seed + part.ordinal * 137;
    data.set(
      [
        0,
        0,
        part.ordinal,
        kind,
        entries.get(part.key).index,
        group.index,
        seed,
        random(seed + 17) + phase,
        (random(seed + 1) - 0.5) * 150,
        (random(seed + 2) - 0.65) * 100,
        6.2 + random(seed + 3) * 2.8,
        0,
        0,
        0,
        group.root_size,
        0,
      ],
      index * 16,
    );
  });
};

const seed_words = (groups, entries, previous) => {
  const data = new Float32Array(groups.length * 20);
  for (const group of groups) {
    const offset = group.index * 20;
    data.set(
      [
        -1000,
        0,
        0,
        group.segments.length,
        entries.get(group.alternates[0]).index,
        group.alternates.length,
        entries.get(group.particles[0]).index,
        group.particles.length,
        group.index * 0.035,
        0,
        0,
        0,
        1,
        207 / 255,
        112 / 255,
        0.85,
        1,
        226 / 255,
        154 / 255,
        1,
      ],
      offset,
    );
    const prior = previous?.groups.find((item) => item.link === group.link);
    if (prior) data[offset] = previous.word_data[prior.index * 20];
  }
  return data;
};

const measure_group = (group, entries, origin, range) => {
  for (const part of group.segments) {
    if (/\s/u.test(part.text)) continue;
    range.setStart(group.label.firstChild, part.start);
    range.setEnd(group.label.firstChild, part.end);
    const rect = range.getBoundingClientRect();
    part.box[0] = rect.left - origin.left;
    part.box[1] = rect.top - origin.top + entries.get(part.key).ascent;
    part.box[2] = rect.width;
    part.box[3] = rect.height;
  }
};

export const create_text_model = (plan, atlas, previous) => {
  const { groups } = plan;
  const records = make_records(groups);
  const actor_data = new Float32Array(records.length * 16);
  const word_data = seed_words(groups, atlas.entries, previous);
  const range = document.createRange();
  seed_actors(records, atlas.entries, actor_data);
  return {
    groups,
    atlas,
    actor_data,
    word_data,
    count: records.length,
    measure(canvas, scrollport, frame) {
      const origin = canvas.getBoundingClientRect();
      const port = scrollport.getBoundingClientRect();
      frame.resolution[0] = origin.width;
      frame.resolution[1] = origin.height;
      frame.clip[0] = Math.max(0, port.left - origin.left);
      frame.clip[1] = Math.max(0, port.top - origin.top);
      frame.clip[2] = Math.min(origin.width, port.right - origin.left);
      frame.clip[3] = Math.min(origin.height, port.bottom - origin.top);
      for (const group of groups)
        measure_group(group, atlas.entries, origin, range);
      records.forEach(({ part }, index) => {
        const offset = index * 16;
        actor_data[offset] = part.box[0];
        actor_data[offset + 1] = part.box[1];
        actor_data[offset + 12] = part.box[2];
        actor_data[offset + 13] = part.box[3];
      });
    },
    reveal(time, route = null) {
      let changed = false;
      for (const group of groups) {
        if (route && route !== group.link) continue;
        const offset = group.index * 20;
        const duration =
          0.76 + group.index * 0.035 + group.segments.length * 0.009;
        if (route && time - word_data[offset] < duration) continue;
        word_data[offset] = time;
        changed = true;
      }
      return changed;
    },
    sync_states() {
      let changed = false;
      for (const group of groups) {
        const offset = group.index * 20;
        const engaged = Number(
          group.link.matches(
            ':hover, :focus-visible, [data-portal-selected="true"]',
          ),
        );
        const active = Number(group.link.dataset.routeActive === "true");
        if (
          word_data[offset + 1] === engaged &&
          word_data[offset + 2] === active
        )
          continue;
        word_data[offset + 1] = engaged;
        word_data[offset + 2] = active;
        changed = true;
      }
      return changed;
    },
  };
};
