struct Frame {
  resolution: vec2f,
  time: f32,
  padding: f32,
  clip: vec4f,
}
struct AtlasEntry { uv: vec4f, bounds: vec4f, metrics: vec4f }
struct Actor { anchor: vec4f, glyph: vec4f, motion: vec4f, box: vec4f }
struct Word { state: vec4f, ranges: vec4f, timing: vec4f, color: vec4f, highlight: vec4f }
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> actors: array<Actor>;
@group(0) @binding(2) var<storage, read> entries: array<AtlasEntry>;
@group(0) @binding(3) var<storage, read> words: array<Word>;
@group(0) @binding(4) var glyph_texture: texture_2d<f32>;
@group(0) @binding(5) var glyph_sampler: sampler;

fn hash(value: u32) -> u32 {
  var x = value;
  x = (x ^ (x >> 16u)) * 0x7feb352du;
  x = (x ^ (x >> 15u)) * 0x846ca68bu;
  return x ^ (x >> 16u);
}
fn random(value: u32) -> f32 { return f32(hash(value) & 0x00ffffffu) / 16777216.0; }
fn rune_step(seed: u32, step: u32, count: u32) -> u32 {
  var glyph = hash(seed) % count;
  for (var i = 1u; i <= step; i++) {
    let pick = hash(seed + i * 137u) % (count - 1u);
    glyph = pick + select(0u, 1u, pick >= glyph);
  }
  return glyph;
}
fn gather_ease(t: f32) -> f32 {
  var u = t;
  for (var i = 0u; i < 5u; i++) {
    let a = 1.0 - u;
    let x = 3.0 * a * a * u * 0.16 + 3.0 * a * u * u * 0.3 + u * u * u;
    let dx = 3.0 * a * a * 0.16 + 6.0 * a * u * 0.14 + 3.0 * u * u * 0.7;
    u = clamp(u - (x - t) / max(dx, 0.0001), 0.0, 1.0);
  }
  return 1.0 - pow(1.0 - u, 3.0);
}
fn gather_alpha(t: f32) -> f32 {
  if (t < 0.22) { return mix(0.0, 0.75, t / 0.22); }
  if (t < 0.82) { return mix(0.75, 0.7, (t - 0.22) / 0.6); }
  return mix(0.7, 0.0, (t - 0.82) / 0.18);
}
fn trail_alpha(t: f32) -> f32 {
  if (t < 0.12) { return t / 0.12; }
  if (t < 0.7) { return 1.0; }
  if (t < 0.88) { return mix(1.0, 0.65, (t - 0.7) / 0.18); }
  return 0.65 * (1.0 - t) / 0.12;
}
fn rotate(point: vec2f, angle: f32) -> vec2f {
  let c = cos(angle);
  let s = sin(angle);
  return vec2f(point.x * c - point.y * s, point.x * s + point.y * c);
}
struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) effect: vec2f,
  @location(3) pixel: vec2f,
}
@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  let actor = actors[instance];
  let word = words[u32(actor.glyph.y)];
  let source = entries[u32(actor.glyph.x)];
  let kind = u32(actor.anchor.w);
  let age = frame.time - word.state.x;
  let seed = u32(actor.glyph.z);
  var entry = source;
  var origin = actor.anchor.xy;
  var scale = 1.0;
  var angle = 0.0;
  var opacity = 1.0;
  var color = mix(word.color.rgb, word.highlight.rgb, max(word.state.y, word.state.z));
  var brightness = 1.0;
  let center = actor.anchor.xy + vec2f(actor.box.x * 0.5, actor.box.y * 0.5 - source.metrics.y);
  var pivot = center;
  var displacement = vec2f(0.0);
  var out: VertexOut;
  out.position = vec4f(2.0, 2.0, 0.0, 1.0);

  if (kind == 0u) {
    let step = u32(clamp(floor(max(age, 0.0) / 0.045), 0.0, 8.0));
    if (step < 8u && actor.anchor.z >= floor(f32(step) / 8.0 * word.state.w)) {
      let rune = rune_step(seed + u32(max(word.state.x, 0.0) * 1000.0), step, u32(word.ranges.y));
      entry = entries[u32(word.ranges.x) + rune];
      origin.x += (source.metrics.x - entry.metrics.x) * 0.5;
    }
  } else if (kind < 3u) {
    let t = (age - word.timing.x - actor.anchor.z * 0.009) / 0.76;
    if (t <= 0.0 || t >= 1.0) { return out; }
    let eased = gather_ease(t);
    scale = (0.55 + 0.7 * eased) * 0.8;
    displacement = actor.motion.xy * (1.0 - eased);
    opacity = gather_alpha(t);
    brightness = 2.0;
    color = vec3f(1.0, 226.0 / 255.0, 154.0 / 255.0);
    if (kind == 1u) {
      entry = entries[u32(word.ranges.x) + hash(seed) % u32(word.ranges.y)];
      origin.x += (source.metrics.x - entry.metrics.x) * 0.5;
      opacity *= 1.0 - smoothstep(0.48, 0.8, t);
      color = vec3f(237.0, 223.0, 184.0) / 255.0;
    } else {
      opacity *= smoothstep(0.42, 0.8, t);
    }
  } else {
    let clock = frame.time / actor.motion.z + actor.glyph.w;
    let cycle = u32(floor(clock));
    let t = fract(clock);
    let key = seed + cycle * 7919u + u32(actor.glyph.w * 997.0);
    entry = entries[u32(word.ranges.z) + hash(key) % u32(word.ranges.w)];
    let direction_angle = random(key + 1u) * 6.2831853;
    let direction = vec2f(cos(direction_angle), sin(direction_angle));
    let distance = (1.0 + random(key + 2u) * 0.8) * actor.box.z;
    let travel = select(t / 0.7 * 0.75, 0.75 + (t - 0.7) / 0.3 * 0.25, t > 0.7);
    displacement = direction * actor.box.xy * 0.2 + direction * distance * travel;
    angle = (random(key + 3u) - 0.5) * 1.134464 * travel;
    scale = select(mix(0.85, 1.0, t / 0.7), mix(1.0, 0.85, (t - 0.7) / 0.3), t > 0.7);
    let assembling = age >= 0.0 && age < 0.76 + word.timing.x + word.state.w * 0.009;
    opacity = trail_alpha(t) * mix(0.45, 0.95, max(word.state.y, select(0.0, 1.0, assembling)));
    color = vec3f(1.0, 208.0 / 255.0, 108.0 / 255.0);
    brightness = 2.0;
    origin = center + vec2f(-entry.metrics.x * 0.5, (entry.metrics.y - entry.metrics.z) * 0.5);
  }

  let corners = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));
  let corner = corners[vertex];
  let point = origin + entry.bounds.xy + corner * entry.bounds.zw;
  let pixel = pivot + rotate((point - pivot) * scale, angle) + displacement;
  out.position = vec4f(pixel.x / frame.resolution.x * 2.0 - 1.0, 1.0 - pixel.y / frame.resolution.y * 2.0, 0.0, 1.0);
  out.pixel = pixel;
  out.uv = mix(entry.uv.xy, entry.uv.zw, corner);
  out.color = vec4f(color, opacity * mix(word.color.a, word.highlight.a, max(word.state.y, word.state.z)));
  out.effect = vec2f(brightness, select(0.0, 1.0, kind == 0u));
  return out;
}

@fragment fn fs_main(input: VertexOut) -> @location(0) vec4f {
  if (any(input.pixel < frame.clip.xy) || any(input.pixel > frame.clip.zw)) { discard; }
  let masks = textureSampleLevel(glyph_texture, glyph_sampler, input.uv, 0.0);
  let brightness = input.effect.x;
  let outer_alpha = masks.b * 0.4;
  let inner_alpha = masks.g * 0.65;
  let outline = masks.a * input.effect.y;
  var color = min(vec3f(1.0, 0.75, 0.28) * brightness, vec3f(1.0)) * outer_alpha;
  var alpha = outer_alpha;
  color = min(vec3f(1.0, 0.89, 0.64) * brightness, vec3f(1.0)) * inner_alpha + color * (1.0 - inner_alpha);
  alpha = inner_alpha + alpha * (1.0 - inner_alpha);
  color *= 1.0 - outline;
  alpha = outline + alpha * (1.0 - outline);
  color = min(input.color.rgb * brightness, vec3f(1.0)) * masks.r + color * (1.0 - masks.r);
  alpha = masks.r + alpha * (1.0 - masks.r);
  return vec4f(color, alpha) * input.color.a;
}
