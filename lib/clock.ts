/**
 * How a stance is played back.
 *
 * Shared by the on screen clock and by the download, so an exported animation
 * runs the same frames in the same order as the character the user was looking
 * at when they asked for it
 */

/** only for a stance delays.json has nothing for */
export const FRAME_MS = 280;

/**
 * The stances built to loop. Everything else plays there and back.
 *
 * wz carries no flag for this, so it comes from measuring how many pixels move
 * on each frame to frame step, including the wrap from the last frame to the
 * first. A stance built as a cycle closes on itself and its wrap is no bigger
 * than any other step. These three do: walk1 1.00x, walk2 0.99x, heal 0.87x.
 *
 * Nothing else with three or more frames comes close. stand1 wraps at 1.36x,
 * alert 1.23x, the swings and stabs 1.16 to 1.43x, and the shooting stances are
 * worst at 2.00x, 2.00x and 2.65x. Their last frame is nowhere near their
 * first, so a plain loop snaps.
 *
 * Two frame stances are not in either list on purpose. They have only one
 * distinct step, so a bounce and a loop are the same thing
 */
const CYCLES = new Set(['walk1', 'walk2', 'heal']);

/** the frame order for a stance, either a cycle or a there and back */
export const sequenceFor = (stance: string, frames: number) => {
  const forward = Array.from({ length: frames }, (_, i) => i);
  if (frames < 3 || CYCLES.has(stance)) return forward;
  // the ends are not repeated, or each would be held for twice its delay
  return [...forward, ...forward.slice(1, -1).reverse()];
};

export type Step = {
  /** how long to hold it */
  ms: number;
  /** the body's frame */
  body: number;
  /** an index into the face's own order, not its frame number */
  face: number;
  /** one frame index per effect */
  effects: number[];
};

/** which frame an own-delays animation is showing at time t */
const frameAt = (delays: number[], t: number) => {
  const total = delays.reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let p = t % total;
  for (let i = 0; i < delays.length; i++) {
    if (p < delays[i]) return i;
    p -= delays[i];
  }
  return 0;
};

/**
 * One pass of the body, cut wherever anything changes.
 *
 * The body, the face and the effects all run on unrelated clocks, so sampling
 * only on the body's frames would drop most of the others: a 100ms effect
 * inside stand1's 500ms hold would show one frame in five. Every boundary from
 * any of them becomes a frame, which is why the output usually has more frames
 * than the stance does.
 *
 * The loop closes on the body. If an effect's period does not divide the
 * body's, its last frame is short by the remainder, which is a seam nobody has
 * ever noticed on a looping glow
 */
export const timeline = (
  bodyOrder: number[],
  bodyMs: number[],
  faceMs: number[],
  effectMs: number[][],
  cap = 120,
): Step[] => {
  const total = bodyMs.reduce((a, b) => a + b, 0);
  if (!total) {
    return [
      { ms: FRAME_MS, body: bodyOrder[0] ?? 0, face: 0, effects: effectMs.map(() => 0) },
    ];
  }

  const cuts = new Set<number>([0]);
  let at = 0;
  for (const ms of bodyMs) {
    at += ms;
    if (at < total) cuts.add(at);
  }
  for (const d of [faceMs, ...effectMs]) {
    const period = d.reduce((a, b) => a + b, 0);
    if (!period || d.length < 2) continue;
    for (let base = 0; base < total; base += period) {
      let t = base;
      for (const ms of d) {
        if (t > 0 && t < total) cuts.add(t);
        t += ms;
      }
    }
  }

  const times = Array.from(cuts).sort((a, b) => a - b);
  // a pathological combination could cut this into hundreds of frames, and
  // nobody wants a 40 MB avatar. dropping the extra cuts costs smoothness in
  // the effect, never correctness in the body
  const kept = times.length > cap
    ? times.filter((_, i) => i % Math.ceil(times.length / cap) === 0)
    : times;

  return kept.map((t, i) => {
    const next = i + 1 < kept.length ? kept[i + 1] : total;
    // which body frame is on screen at t
    let acc = 0;
    let body = bodyOrder[0] ?? 0;
    for (let k = 0; k < bodyMs.length; k++) {
      if (t < acc + bodyMs[k]) {
        body = bodyOrder[k];
        break;
      }
      acc += bodyMs[k];
    }
    return {
      ms: next - t,
      body,
      face: frameAt(faceMs, t),
      effects: effectMs.map(d => frameAt(d, t)),
    };
  });
};
