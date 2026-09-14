import { supportsUj630Performance } from "./uj630Performance.js";
let route = "", generation = 0, lastInput = 0, timer = 0, frame = 0, hidden = false, active = 0, dispatchKey = null, rapidInput = false;
const pending = new Map(), listeners = new Set();
export function isUj630ActivityHidden() { return hidden; }
function quietPeriod() { return rapidInput ? 250 : 150; }
export function shouldDeferUj630Work() {
  return supportsUj630Performance() && (hidden || route === "player" || Date.now() - lastInput < quietPeriod());
}
export function captureUj630Owner() {
  const captured = generation;
  return { route, generation: captured, isCurrent: () => captured === generation };
}
export function onUj630ActivityChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
function notify() { listeners.forEach(listener => { try { listener(); } catch (_) {} }); }
function schedule() {
  if (!pending.size || frame || timer || active >= 2 || hidden || route === "player") return;
  const delay = quietPeriod() - (Date.now() - lastInput);
  if (delay > 0) { timer = setTimeout(() => { timer = 0; schedule(); notify(); }, delay + 1); return; }
  frame = requestAnimationFrame(flush);
}
function flush() {
  frame = 0;
  if (shouldDeferUj630Work() || active >= 2) { schedule(); return; }
  const pair = pending.entries().next().value;
  if (!pair) return;
  const [key, entry] = pair; pending.delete(key);
  if (entry.owner && !entry.owner.isCurrent()) { schedule(); return; }
  active++;
  Promise.resolve().then(() => {
    dispatchKey = key;
    try { return entry.task(); } finally { dispatchKey = null; }
  }).catch(() => {}).finally(() => { active--; schedule(); });
  schedule();
}
export function noteUj630Input() {
  if (!supportsUj630Performance()) return;
  const now = Date.now(), gap = now - lastInput;
  // Discrete quick taps also form sustained navigation. Do not start and then
  // abort a download in the tiny idle gap between consecutive remote presses.
  if (gap > 20) rapidInput = lastInput > 0 && gap < 300;
  lastInput = now;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { timer = 0; schedule(); notify(); }, quietPeriod() + 5);
  notify();
}
export function setUj630ActivityRoute(value) {
  route = value; generation++;
  pending.forEach((entry, key) => { if (entry.owner) pending.delete(key); });
  notify(); schedule();
}
export function setUj630ActivityHidden(value) { hidden = value; notify(); if (!hidden) schedule(); }
export function cancelUj630WorkOwner(ownerRoute) {
  pending.forEach((entry, key) => { if (entry.owner?.route === ownerRoute) pending.delete(key); });
}
export function deferUj630Work(key, task, { persistent = key.startsWith("sync-") } = {}) {
  if (!supportsUj630Performance()) return false;
  if (dispatchKey === key && !shouldDeferUj630Work()) return false;
  if (!shouldDeferUj630Work() && !pending.size && active === 0) return false;
  pending.set(key, { task, owner: persistent ? null : captureUj630Owner() });
  schedule(); return true;
}
export function uj630ActivityStats() { return { pending: pending.size, active, scheduled: Boolean(frame || timer) }; }
// Explicit cooperative work units; no frame loop remains after completion/cancellation.
export async function forEachUj630Slice(items, visit, isCurrent = () => true) {
  const now = () => typeof performance !== "undefined" ? performance.now() : Date.now();
  let started = now();
  for (let index = 0; index < items.length; index++) {
    if (!isCurrent()) return false;
    visit(items[index], index);
    if (supportsUj630Performance() && now() - started >= 5 && index + 1 < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0)); started = now();
    }
  }
  return isCurrent();
}
