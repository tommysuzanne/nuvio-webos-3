// Ported from Android NuvioTV ui/screens/player/PlayerScrubRates.kt so the web
// player scrubs at the same rate as the app.
//
// Remotes fire repeated key events while a direction key is held (the repeat
// count grows). Mapping that count to progressively larger steps makes long
// holds scrub faster without changing the feel of a single tap.

export const STEP_SHORT_MS = 10000;
export const STEP_MEDIUM_MS = 20000;
export const STEP_LONG_MS = 30000;
export const STEP_VERY_LONG_MS = 60000;

const MEDIUM_REPEAT_THRESHOLD = 3;
const LONG_REPEAT_THRESHOLD = 8;
const VERY_LONG_REPEAT_THRESHOLD = 15;

// Seek step magnitude (always positive) for the given key repeat count. Callers
// apply the sign for forward / backward.
export function stepMsForKeyRepeat(repeatCount) {
  const count = Math.max(0, Math.trunc(Number(repeatCount)) || 0);
  if (count >= VERY_LONG_REPEAT_THRESHOLD) {
    return STEP_VERY_LONG_MS;
  }
  if (count >= LONG_REPEAT_THRESHOLD) {
    return STEP_LONG_MS;
  }
  if (count >= MEDIUM_REPEAT_THRESHOLD) {
    return STEP_MEDIUM_MS;
  }
  return STEP_SHORT_MS;
}

// Signed delta for a rewind (negative) or forward (positive) scrub.
export function deltaMsForKeyRepeat(repeatCount, forward) {
  const step = stepMsForKeyRepeat(repeatCount);
  return forward ? step : -step;
}
