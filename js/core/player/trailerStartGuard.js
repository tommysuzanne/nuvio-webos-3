// One deadline, no permanent polling. A loaded player is not proof of playback.
export function watchTrailerStart({ getCurrentTime, onStall, timeoutMs = 15000 }) {
  const timer = setTimeout(() => {
    if (!(Number(getCurrentTime()) > 0)) onStall();
  }, timeoutMs);
  return () => clearTimeout(timer);
}
