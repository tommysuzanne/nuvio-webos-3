import { NuvioDialog } from "./nuvioDialog.js";
import { requestWebOsCompanionService } from "../../platform/webos/webosCompanionService.js";
import { focusWithoutScroll } from "../../platform/legacyDom.js";

export function nativeTrailerQuery(meta = {}, params = {}) {
  const year = String(meta.year || meta.releaseInfo || meta.released || "").match(/(?:19|20)[0-9]{2}/);
  return {
    title: String(meta.name || meta.title || params.fallbackTitle || ""),
    originalTitle: String(meta.originalTitle || meta.original_name || meta.original_title || ""),
    type: (meta.type || params.itemType) === "series" ? "series" : "movie",
    year: year ? Number(year[0]) : null
  };
}

// One owner for the dialog, HTTP request, media element and input handlers.
// No polling, no film progress writes, and no video bytes buffered in JS.
export class NativeTrailerDialog {
  constructor({ query, onClose, request = requestWebOsCompanionService }) {
    this.query = query;
    this.onClose = onClose;
    this.request = request;
    this.closed = false;
    this.generation = 0;
  }

  show(subtitle, buttons) {
    this.dialog?.destroy();
    this.dialog = new NuvioDialog({
      title: "Bande-annonce",
      subtitle,
      buttons,
      onDismiss: () => this.close(),
      panelClassName: "uj-trailer-choice",
      widthVw: 52
    }).mount();
  }

  async read(parameters) {
    this.controller?.abort();
    this.controller = new AbortController();
    const generation = ++this.generation;
    const response = await this.request({
      method: "nativeTrailers", parameters,
      signal: this.controller.signal, timeoutMs: 26000, retryOnFailure: false
    });
    if (this.closed || generation !== this.generation) throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
    return response.payload.result;
  }

  async open() {
    this.show("Recherche des versions VF et VO…", [{label:"Retour", onAction:() => this.close()}]);
    try {
      const result = await this.read({ action:"list", ...this.query });
      if (!result?.choices?.length) {
        this.show("Aucune bande-annonce compatible trouvée pour ce titre.", [{label:"Retour", onAction:() => this.close()}]);
        return;
      }
      this.choices = result.choices;
      this.showChoices();
    } catch (error) { this.fail(error, () => this.open()); }
  }

  showChoices() {
    this.stopVideo();
    this.show(`${this.query.title} · Source : AlloCiné`, [
      ...this.choices.map(choice => ({
        label: choice.language === "VF" ? "VF — Français" : choice.language === "VOST" ? "VO — Sous-titrée" : "VO — Version originale",
        key: choice.language,
        onAction: () => this.select(choice)
      })),
      { label:"Retour", onAction:() => this.close() }
    ]);
  }

  async select(choice) {
    this.show("Préparation de la bande-annonce…", [{label:"Retour", onAction:() => this.close()}]);
    try {
      const result = await this.read({action:"resolve", selection:choice});
      if (!/^https:\/\/fr\.vid\.web\.acsta\.net\/[^?#]+\.mp4(?:\?[^#]*)?$/.test(result?.url || "")) throw Error("Invalid trailer");
      this.play(result.url, choice);
    } catch (error) { this.fail(error, () => this.select(choice)); }
  }

  fail(error, retry) {
    if (this.closed || error?.name === "AbortError") return;
    this.stopVideo();
    this.show("Cette bande-annonce est momentanément indisponible.", [
      {label:"Réessayer", onAction:retry},
      ...(this.choices ? [{label:"Choisir VO / VF", onAction:() => this.showChoices()}] : []),
      {label:"Retour", onAction:() => this.close()}
    ]);
  }

  play(url, choice) {
    this.dialog?.destroy(); this.dialog = null;
    this.stopVideo();
    const layer = document.createElement("div");
    layer.className = "uj-native-trailer";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-label", "Bande-annonce");
    layer.setAttribute("aria-modal", "true");
    const video = document.createElement("video");
    video.className = "uj-native-trailer-video";
    video.setAttribute("playsinline", "");
    video.preload = "metadata";
    const title = document.createElement("div");
    title.className = "uj-native-trailer-title";
    title.textContent = choice.title;
    const controls = document.createElement("div");
    controls.className = "uj-native-trailer-controls";
    const toggle = document.createElement("button");
    toggle.textContent = "Lecture / Pause";
    const back = document.createElement("button");
    back.textContent = "Retour";
    const status = document.createElement("span");
    status.textContent = "Chargement…";
    status.setAttribute("role", "status");
    controls.appendChild(toggle); controls.appendChild(back); controls.appendChild(status);
    layer.appendChild(video); layer.appendChild(title); layer.appendChild(controls);
    this.layer = layer; this.video = video;
    document.body.appendChild(layer);
    const resume = () => {
      try { const promise = video.play(); if (promise?.catch) promise.catch(error => this.fail(error, () => this.select(choice))); }
      catch(error) { this.fail(error, () => this.select(choice)); }
    };
    const togglePlayback = () => { if (video.paused) resume(); else video.pause(); };
    toggle.onclick = togglePlayback;
    back.onclick = () => this.close();
    video.onplaying = () => { toggle.textContent = "Pause"; status.textContent = `${choice.language} · ${video.videoHeight ? video.videoHeight + "p" : "Lecture"} · AlloCiné`; };
    video.onpause = () => { toggle.textContent = "Lecture"; status.textContent = "En pause"; };
    video.onwaiting = () => { status.textContent = "Chargement…"; };
    video.ontimeupdate = () => { if (video.currentTime > 0) { clearTimeout(this.startTimer); this.startTimer = null; } };
    video.onended = () => this.close();
    video.onerror = () => this.fail(Error("Playback failed"), () => this.select(choice));
    this.keyHandler = event => {
      const code = event.keyCode || event.which;
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) return;
      if ([8,27,461,10009].includes(code)) this.close();
      else if (code === 13) { if (document.activeElement === back) this.close(); else togglePlayback(); }
      else if ([32,179,10252].includes(code)) togglePlayback();
      else if (code === 415) resume();
      else if (code === 19) video.pause();
      else if (code === 39) focusWithoutScroll(back);
      else if (code === 37) focusWithoutScroll(toggle);
    };
    this.keyUpHandler = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    window.addEventListener("keydown", this.keyHandler, true);
    window.addEventListener("keyup", this.keyUpHandler, true);
    this.visibilityHandler = () => { if (document.hidden) video.pause(); };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    focusWithoutScroll(toggle);
    this.startTimer = setTimeout(() => {
      if (!this.closed && this.video === video && !(video.currentTime > 0)) this.fail(Error("Start timeout"), () => this.select(choice));
    }, 15000);
    video.src = url;
    resume();
  }

  stopVideo() {
    clearTimeout(this.startTimer); this.startTimer = null;
    if (this.keyHandler) window.removeEventListener("keydown", this.keyHandler, true);
    if (this.keyUpHandler) window.removeEventListener("keyup", this.keyUpHandler, true);
    if (this.visibilityHandler) document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.keyHandler = this.keyUpHandler = this.visibilityHandler = null;
    if (this.video) {
      this.video.onplaying = this.video.onpause = this.video.onwaiting = this.video.ontimeupdate = this.video.onended = this.video.onerror = null;
      this.video.pause(); this.video.removeAttribute("src"); this.video.load(); this.video = null;
    }
    this.layer?.remove(); this.layer = null;
  }

  close(restore = true) {
    if (this.closed) return;
    this.closed = true; this.generation += 1;
    this.controller?.abort(); this.controller = null;
    this.stopVideo(); this.dialog?.destroy(); this.dialog = null;
    if (restore) this.onClose?.();
  }
}
