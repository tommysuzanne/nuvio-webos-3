import { Uj630Images } from "../../core/media/uj630Images.js";

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export function visibleRange(count, offset, viewport, stride, overscan = 2) {
  if (!count || stride <= 0) return [0, 0];
  return [Math.max(0, Math.floor(offset / stride) - overscan),
    Math.min(count, Math.ceil((offset + viewport) / stride) + overscan)];
}

export function uj630CardSignature(item) {
  return [item.id || item.contentId, item.rawTitle || item.title || item.name,
    item.coverImageUrl, item.poster, item.thumbnail, item.episodeThumbnail,
    item.backdrop, item.background, item.coverEmoji, item.hideTitle,
    item.progressPercent, item.positionMs, item.durationMs, item.season, item.episode,
    item.isNextUp, item.hasAired, item.progressStatus,
    item.videoId, item.type || item.contentType, item.ujPlaceholder,
    item.collectionId, item.folderId, item.collectionTitle,
    item.logo, item.addonBaseUrl, item.addonId, item.addonName].join("|");
}

// Logical focus and scroll offsets outlive DOM cards. A keypress only updates
// the small visible window, never a navigation graph built from the full list.
export class Uj630BrowseWindow {
  constructor({ screen, main, renderCard, onNearEnd = null, onActivate = null, onNeedItem = null, resolveItem = null }) {
    this.screen = screen;
    this.main = main;
    main.tabIndex = -1; main.setAttribute("role", "listbox");
    main.setAttribute("data-uj-navigation", "readonly");
    this.renderCard = renderCard;
    this.onNearEnd = onNearEnd;
    this.onActivate = onActivate;
    this.onNeedItem = onNeedItem; this.resolveItem=resolveItem;
    this.scale = innerWidth / 1920;
    this.viewportWidth = main.clientWidth || innerWidth * 0.91;
    this.viewportHeight = main.clientHeight || innerHeight;
    this.rows = [];
    this.mounted = new Map();
    this.scrolls = new Map();
    this.focus = { row: 0, col: 0 };
    this.disposed = false; this.windowDirty = true;
    this.cardTasks=new Map();this.cardFrame=0;
    this.content = document.createElement("div");
    this.content.className = "uj-browse-content";
    main.appendChild(this.content);
    this.scrollY=0;
    this.onScroll = () => { const y=this.main.scrollTop; if(y===this.scrollY)return; this.scrollY=y; this.windowDirty=true; this.scheduleWindow(); };
    this.onWheel = event => {
      if (screen.sidebarExpanded) { event.preventDefault(); return; }
      Uj630Images.interact();
    };
    this.onFocusIn = event => {
      const card = event.target?.closest?.("[data-uj-col]");
      if (card) {
        this.focus = { row: Number(card.dataset.ujRow), col: Number(card.dataset.ujCol) };
        if (this.currentNode && this.currentNode !== card) this.currentNode.classList.remove("focused");
        card.classList.add("focused"); this.currentNode = card;
        this.screen.lastMainFocus = card;
      }
    };
    main.addEventListener("scroll", this.onScroll);
    main.addEventListener("wheel", this.onWheel);
    main.addEventListener("focusin", this.onFocusIn);
  }

  metrics(row) {
    const portrait = row.kind === "resume" || row.kind === "posters";
    return { stride: (portrait ? 220 : 320) * this.scale,
      width: (portrait ? 200 : 300) * this.scale,
      height: (portrait ? 404 : 268) * this.scale,
      cardHeight: (portrait ? 348 : 218) * this.scale };
  }

  ownsFocus() {
    if (this.screen.sidebarExpanded || this.screen.continueWatchingMenu || this.screen.posterHoldMenu ||
        this.screen.posterListPicker || this.screen.openPicker || this.screen.posterOptionsController?.dialog) return false;
    const active = document.activeElement;
    return !active || active === document.body || active === this.main ||
      Boolean(active.closest?.(".uj-card")) || !document.documentElement?.contains?.(active);
  }

  setRows(rows, saved = null) {
    const restoreFocus = this.ownsFocus();
    const previous = this.rows[this.focus.row];
    const item = previous?.items?.[this.focus.col];
    const selectedKey = saved?.rowKey || previous?.key;
    const selectedId = saved?.itemId || String(item?.id || item?.contentId || "");
    this.rows = rows; this.windowDirty=true;this.rowsRevision=(this.rowsRevision||0)+1;
    let top = 0;
    rows.forEach(row => { row.top = top; row.metrics = this.metrics(row); top += row.metrics.height; });
    if (this.content.style.height !== `${top}px`) this.content.style.height = `${top}px`;
    const index = rows.findIndex(row => row.key === selectedKey);
    let row = clamp(index >= 0 ? index : saved?.row ?? this.focus.row, 0, Math.max(0, rows.length - 1));
    if (selectedId && !(rows[row]?.items || []).some(it => String(it.id || it.contentId || "") === selectedId)) {
      const moved = rows.findIndex(r => r.items.some(it => String(it.id || it.contentId || "") === selectedId));
      if (moved >= 0) row = moved;
    }
    const items = rows[row]?.items || [];
    const found = selectedId ? items.findIndex(it => String(it.id || it.contentId || "") === selectedId) : -1;
    this.focus = { row, col: clamp(found >= 0 ? found : saved?.col ?? this.focus.col, 0, Math.max(0, items.length - 1)) };
    if (saved?.scrolls) Object.keys(saved.scrolls).forEach(key => this.scrolls.set(key, saved.scrolls[key]));
    if (saved) { this.scrollY=Number(saved.scrollTop || 0); this.main.scrollTop=this.scrollY; }
    this.updateWindow();
    if (restoreFocus) this.focusCurrent();
  }

  capture() {
    const row = this.rows[this.focus.row];
    const item = row?.items[this.focus.col];
    const scrolls = {};
    this.scrolls.forEach((v, k) => { scrolls[k] = v; });
    return { layoutMode: "uj630", scope:this.screen.ujNavigationScope, row:this.focus.row, col:this.focus.col, rowKey: row?.key || "",
      itemId: String(item?.id || item?.contentId || ""), scrollTop: this.scrollY, scrolls };
  }

  scheduleWindow() {
    if (this.frame || this.disposed) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.updateWindow(); });
  }

  releaseRow(entry) {
    Uj630Images.releaseTree(entry.node);
    entry.track.removeEventListener("wheel", entry.onWheel);
    entry.node.remove();
  }

  updateWindow(force = false) {
    if (this.disposed || (!force && !this.windowDirty)) return;
    this.windowDirty=false;this.cardTasks.clear();
    const y = this.scrollY;
    const height = this.viewportHeight;
    let first = this.rows.findIndex(row => row.top + row.metrics.height > y);
    if (first < 0) first = Math.max(0, this.rows.length - 1);
    let last = first;
    while (last < this.rows.length && this.rows[last].top < y + height) last++;
    first = Math.max(0, first - 1);
    last = Math.min(this.rows.length, last + 1);
    const keep = new Set();
    for (let ri = first; ri < last; ri++) {
      const row = this.rows[ri];
      keep.add(row.key);
      let entry = this.mounted.get(row.key);
      if (!entry) {
        const node = document.createElement("section");
        node.className = "uj-browse-row home-modern-row";
        const title = document.createElement("h2"); title.className = "uj-row-title";
        const track = document.createElement("div"); track.className = "uj-row-track home-track";
        const canvas = document.createElement("div"); canvas.className = "uj-row-canvas";
        track.appendChild(canvas); node.appendChild(title); node.appendChild(track); this.content.appendChild(node);
        entry = { node, title, track, canvas, cards: new Map() };
        entry.onWheel = event => {
          const delta = Number(event.deltaX || 0);
          if (!delta) return;
          event.preventDefault(); Uj630Images.interact();
          const next = clamp((this.scrolls.get(row.key) || 0) + delta, 0,
            Math.max(0, entry.canvasWidth - this.viewportWidth));
          this.scrolls.set(row.key, next); this.windowDirty=true; this.scheduleWindow();
        };
        track.addEventListener("wheel", entry.onWheel);
        this.mounted.set(row.key, entry);
      }
      if (entry.node.dataset.rowKey !== row.key) entry.node.dataset.rowKey = row.key;
      if (entry.top !== row.top) { entry.top = row.top; entry.node.style.top = `${row.top}px`; }
      if (entry.height !== row.metrics.height) { entry.height = row.metrics.height; entry.node.style.height = `${row.metrics.height}px`; }
      if (entry.title.textContent !== row.title) entry.title.textContent = row.title;
      const canvasWidth = Math.max(1, row.items.length) * row.metrics.stride;
      if (entry.canvasWidth !== canvasWidth) { entry.canvasWidth = canvasWidth; entry.canvas.style.width = `${canvasWidth}px`; }
      if (entry.cardHeight !== row.metrics.cardHeight) { entry.cardHeight = row.metrics.cardHeight; entry.canvas.style.height = `${row.metrics.cardHeight}px`; }
      const x = this.scrolls.get(row.key) || 0;
      // Logical horizontal scrolling avoids a second scroll event whose
      // scrollLeft getter forces layout after each keyboard update on C38.
      if (entry.x !== x) { entry.x = x; entry.canvas.style.left = `${-x}px`; }
      const width = this.viewportWidth;
      const [start, end] = visibleRange(row.items.length, x, width, row.metrics.stride, 2);
      if(!force && entry.revision===this.rowsRevision && entry.windowX===x && entry.windowY===y &&
        entry.cards.size===end-start)continue;
      entry.revision=this.rowsRevision;entry.windowX=x;entry.windowY=y;
      entry.cards.forEach((card, ci) => {
        if (ci < start || ci >= end) { Uj630Images.releaseTree(card.node); card.node.remove(); entry.cards.delete(ci); }
      });
      for (let ci = start; ci < end; ci++) {
        const raw = row.items[ci];
        const item = this.resolveItem ? this.resolveItem(raw,row,ci) : raw;
        if (this.onNeedItem) this.onNeedItem(item, row);
        const signature = uj630CardSignature(item);
        const card = entry.cards.get(ci);
        const visible = row.top + row.metrics.height > y && row.top < y + height &&
          ci * row.metrics.stride + row.metrics.width > x && ci * row.metrics.stride < x + width;
        if (!card || card.signature !== signature || card.ri !== ri) {
          this.cardTasks.set(`${row.key}:${ci}`,{entry,row,item,ci,ri,signature,priority:visible?0:1});
        } else if(force || card.priority!==(visible?0:1)) {
          card.priority=visible?0:1;Uj630Images.enqueueTree(card.node,card.priority);
        }
      }
      if (row.hasMore && end >= row.items.length - 2) this.onNearEnd?.(row);
    }
    this.mounted.forEach((entry, key) => { if (!keep.has(key)) { this.releaseRow(entry); this.mounted.delete(key); } });
    this.scheduleCard();
  }

  materializeCard(task) {
    const {entry,row,item,ci,ri,signature,priority}=task;
    this.cardTasks.delete(`${row.key}:${ci}`);
    if(this.disposed || this.mounted.get(row.key)!==entry)return null;
    const old=entry.cards.get(ci);
    if(old){Uj630Images.releaseTree(old.node);old.node.remove();}
    const temp=document.createElement("div");temp.innerHTML=this.renderCard(row,item,ci,ri);
    const node=temp.firstElementChild;if(!node)return null;
    node.id=`${this.screen.container.id}-uj-${ri}-${ci}`;node.setAttribute("role","option");
    node.dataset.ujRow=String(ri);node.dataset.ujCol=String(ci);
    node.dataset.navRow=String(ri);node.dataset.navCol=String(ci);
    node.style.left=`${ci*row.metrics.stride}px`;node.style.width=`${row.metrics.width}px`;
    node.style.height=`${row.metrics.cardHeight}px`;
    entry.cards.set(ci,{node,signature,ri,ci,priority});entry.canvas.appendChild(node);
    Uj630Images.enqueueTree(node,priority);
    return node;
  }

  scheduleCard() {
    if(this.disposed||this.cardFrame||!this.cardTasks.size)return;
    this.cardFrame=requestAnimationFrame(()=>{
      this.cardFrame=0;if(this.disposed)return;
      const tasks=Array.from(this.cardTasks.values()).sort((a,b)=>a.priority-b.priority);
      if(tasks.length)this.materializeCard(tasks[0]);
      this.scheduleCard();
    });
  }

  focusCurrent(ensureVisible = true) {
    const row = this.rows[this.focus.row];
    if (!row || !row.items.length) return false;
    if (ensureVisible) {
      const y = this.scrollY;
      let nextY=y;
      if (row.top < y) nextY=row.top;
      else if (row.top + row.metrics.height > y + this.viewportHeight) nextY=row.top+row.metrics.height-this.viewportHeight;
      if(nextY!==y) { this.scrollY=nextY; this.main.scrollTop=nextY; this.windowDirty=true; }
      const width = this.viewportWidth;
      const left = this.focus.col * row.metrics.stride;
      let x = this.scrolls.get(row.key) || 0;
      if (left < x) x = left;
      else if (left + row.metrics.width > x + width) x = left + row.metrics.width - width;
      x=Math.max(0,x);
      if((this.scrolls.get(row.key)||0)!==x) { this.scrolls.set(row.key,x);this.windowDirty=true; }
    }
    this.updateWindow();
    const task=this.cardTasks.get(`${row.key}:${this.focus.col}`);
    if(task)this.materializeCard(task);
    const node = this.mounted.get(row.key)?.cards.get(this.focus.col)?.node;
    if (!node) return false;
    if (this.currentNode !== node || !node.classList.contains("focused")) {
      if (this.currentNode) this.currentNode.classList.remove("focused");
      this.screen.container.querySelectorAll(".uj-folder-header .focused, .search-header .focused, .discover-picker-row .focused, .home-sidebar .focused").forEach(n => n.classList.remove("focused"));
      node.classList.add("focused");
      this.main.setAttribute("aria-activedescendant",node.id);
    }
    // Chromium38's focus scrolls and recalculates every ancestor. Keep native
    // focus on the listbox; the selected option is logical and announced by ARIA.
    if (document.activeElement !== this.main) this.main.focus();
    this.currentNode = node; this.screen.lastMainFocus = node;
    return true;
  }

  openMenu(openedByBack = false) {
    const items = this.screen.container.querySelectorAll(".home-sidebar .focusable");
    if (!items.length) return false;
    this.screen.sidebarExpanded = true; this.screen.sidebarOpenedByBack = openedByBack;
    this.screen.container.classList.add("uj-menu-open");
    const node = this.screen.container.querySelector(".home-sidebar .focusable.selected") || items[0];
    this.focusMenuNode(node); return true;
  }

  focusMenuNode(node) {
    this.screen.container.querySelectorAll(".focused").forEach(n => n.classList.remove("focused"));
    node.classList.add("focused"); this.currentNode = node;
    if (document.activeElement !== this.main) this.main.focus();
  }

  closeMenu() {
    this.screen.sidebarExpanded = false; this.screen.sidebarOpenedByBack = false;
    this.screen.container.classList.remove("uj-menu-open"); this.focusCurrent();
  }

  handleKey(event) {
    const code = Number(event.keyCode || 0);
    if (code < 37 || code > 40) return false;
    event.preventDefault?.(); Uj630Images.interact();
    if (this.screen.sidebarExpanded) {
      if (code === 39) this.closeMenu();
      else if (code === 38 || code === 40) {
        const nodes = Array.from(this.screen.container.querySelectorAll(".home-sidebar .focusable"));
        const index = nodes.findIndex(n => n.classList.contains("focused"));
        this.focusMenuNode(nodes[clamp(index + (code === 40 ? 1 : -1), 0, nodes.length - 1)]);
      }
      return true;
    }
    const row = this.rows[this.focus.row];
    if (!row) return true;
    if (code === 37 && this.focus.col === 0 && this.openMenu()) return true;
    if (code === 37 || code === 39) {
      this.focus.col = clamp(this.focus.col + (code === 39 ? 1 : -1), 0, Math.max(0, row.items.length - 1));
    } else {
      let ri = this.focus.row + (code === 40 ? 1 : -1);
      while (ri >= 0 && ri < this.rows.length && !this.rows[ri].items.length) ri += code === 40 ? 1 : -1;
      if (ri >= 0 && ri < this.rows.length) {
        this.focus.row = ri;
        this.focus.col = clamp(this.focus.col, 0, Math.max(0, this.rows[ri].items.length - 1));
      }
    }
    this.focusCurrent(); return true;
  }

  destroy() {
    this.disposed = true;
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.cardFrame) cancelAnimationFrame(this.cardFrame);
    this.cardTasks.clear();
    this.main.removeEventListener("scroll", this.onScroll);
    this.main.removeEventListener("wheel", this.onWheel);
    this.main.removeEventListener("focusin", this.onFocusIn);
    this.mounted.forEach(entry => this.releaseRow(entry)); this.mounted.clear();
    this.content.remove(); this.currentNode = null;
  }
}
