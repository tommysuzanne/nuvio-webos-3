import { uj630NavigationScope } from "../../navigation/uj630NavigationScope.js";
import { Uj630CatalogLoader, resolveUj630Catalog } from "../../../core/media/uj630CatalogPages.js";
import { Uj630BrowseWindow } from "../../components/uj630BrowseWindow.js";
import { renderUjCard } from "../../components/uj630Cards.js";
import { Uj630Images } from "../../../core/media/uj630Images.js";
import { focusWithoutScroll } from "../../../platform/legacyDom.js";

export function clearUj630Results(screen) {
  if (screen.ujResultsClickMount && screen.ujResultsClick)
    screen.ujResultsClickMount.removeEventListener('click', screen.ujResultsClick);
  screen.ujResultsClickMount=null; screen.ujResultsClick=null;
  screen.ujCatalogLoader?.dispose();screen.ujCatalogLoader=null;
  if (screen.ujResults) {
    screen.ujResultsState=screen.ujResults.capture();screen.ujResults.destroy();screen.ujResults=null;
  }
  if(screen.container) Uj630Images.releaseTree(screen.container);
}
export function renderUj630Results(screen, kind) {
  const mount=screen.container?.querySelector(kind==='search'?'.uj-search-results':'#discoverGridMount');
  if(!mount)return;
  screen.ujNavigationScope = uj630NavigationScope();
  if (screen.ujResultsState?.scope !== screen.ujNavigationScope) screen.ujResultsState = null;
  const active=document.activeElement;
  const hadCard=!!screen.ujResults?.currentNode?.classList.contains('focused') || !!active?.closest?.('.uj-card');
  if(screen.ujResults && screen.ujResults.main!==mount)clearUj630Results(screen);
  screen.container.classList.add('uj-home','uj-results-screen');
  mount.classList.add('uj-results-window');
  if(!screen.ujResults){
    mount.innerHTML='';
    screen.ujCatalogLoader=new Uj630CatalogLoader(()=>{
      if(screen.ujResults){screen.ujResults.windowDirty=true;screen.ujResults.updateWindow(true);if(screen.ujResults.ownsFocus())screen.ujResults.focusCurrent(false);}
    });
    screen.ujResults=new Uj630BrowseWindow({screen,main:mount,resolveItem:resolveUj630Catalog,onNeedItem:item=>screen.ujCatalogLoader.need(item),renderCard:(row,item,index,ri)=>{
      const markup=renderUjCard(row,item,index,ri);
      return markup.replace('uj-card home-content-card',`uj-card ${kind==='search'?'search-result-card':'discover-card seeall-card'} home-content-card`)
        .replace('data-action=',`data-row-key="${row.key}" data-focus-key="item:${String(item.id||'').replace(/["<>]/g,'')}" data-result-index="${row.start+index}" data-action=`);
    },onNearEnd:row=>{
      if(kind==='discover' && row.last && !screen.loading && screen.hasMore)void screen.loadNextPage({preserveViewport:true,partialRender:true,suppressLoadingRender:true});
    }});
    // Existing controls retain their keyboard and long-press behavior. New cards
    // use delegation, so recycled elements require no per-card subscriptions.
    screen.ujResultsClick=event=>{const card=event.target?.closest?.('.uj-card');if(card && card.dataset.ujPlaceholder!=="true")screen.openDetailFromNode(card);};
    screen.ujResultsClickMount=mount; mount.addEventListener('click',screen.ujResultsClick);
  }
  const rows=[];
  if(kind==='search'){
    (screen.rows||[]).forEach((row,i)=>rows.push({...row,key:`search-${i}`,kind:'posters',start:0,
      items:(row.initialItems||row.items||[]),title:row.title||row.catalogName||''}));
  }else{
    for(let start=0;start<screen.items.length;start+=7)rows.push({...screen.getSelectedCatalog(),key:`discover-${start}`,kind:'posters',title:'',start,
      items:screen.items.slice(start,start+7),last:start+7>=screen.items.length,hasMore:start+7>=screen.items.length&&screen.hasMore});
  }
  screen.ujResults.setRows(rows,screen.ujResultsState);screen.ujResultsState=null;
  if(active && !hadCard && screen.container.contains(active)){screen.container.querySelectorAll('.uj-card.focused').forEach(n=>n.classList.remove('focused'));focusWithoutScroll(active);}
}
export function handleUj630ResultsKey(screen,event,kind) {
  const view=screen.ujResults;if(!view||screen.openPicker||screen.posterOptionsController?.dialog)return false;
  const code=Number(event.keyCode),node=screen.container.querySelector(".focusable.focused") || document.activeElement;
  const card=node?.closest?.('.uj-card');
  if(card && code===13 && card.dataset.ujPlaceholder==="true")return true;
  if(card && code>=37 && code<=40){
    if(code===38 && view.focus.row===0){
      const header=screen.container.querySelector(kind==='search'?'#searchInput':'.discover-filter.focusable');
      if(header){card.classList.remove('focused');header.classList.add('focused');focusWithoutScroll(header);return true;}
    }
    if(code===37 && view.focus.col===0){void screen.openSidebar();return true;}
    view.handleKey(event);return true;
  }
  if(!card&&code===40&&node?.closest?.(kind==='search'?'.search-header':'.discover-picker-row')){
    screen.focusZone='content';view.focusCurrent();return true;
  }
  return false;
}
