// Artwork faces left before mirroring. A planted paw travels right relative
// to the body; only the forward (leftward) recovery stroke lifts off the ground.
export function pantherPaw(phase: number, stride: number) {
  return { reach: Math.sin(phase) * stride, lift: Math.max(0, -Math.cos(phase)) * 11 };
}
