// Give the two hero images a bounded head start over season/recommendation
// fan-out. One frame lets the scheduled header patch run; load/error events end
// the wait. There is no polling loop, and unmount cancels both frame and timer.
export function waitForUj630Hero(root, isCurrent, timeoutMs = 1800) {
  let frame = 0, timer = 0, finished = false, images = [];
  let complete;
  const promise = new Promise(resolve => { complete = resolve; });
  const finish = () => {
    if (finished) return;
    finished = true;
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
    images.forEach(image => {
      image.removeEventListener("load", check);
      image.removeEventListener("error", finish);
    });
    complete();
  };
  const check = () => {
    if (!isCurrent() || images.every(image => image.complete && image.naturalWidth > 0)) finish();
  };
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!isCurrent()) { finish(); return; }
    images = Array.from(root.querySelectorAll('img[data-uj-image-role="logo"], img[data-uj-image-role="backdrop"]'));
    images.forEach(image => { image.addEventListener("load", check); image.addEventListener("error", finish); });
    check();
  });
  timer = setTimeout(finish, timeoutMs);
  return { promise, cancel: finish };
}
