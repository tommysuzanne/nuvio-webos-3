import { isUj630CollectionsEnabled } from "./uj630Performance.js";
let route="", observer=null;
function apply() {
  const dedicated=document.querySelector('link[href*="uj630.css"]');
  const lean=!!dedicated?.sheet && isUj630CollectionsEnabled() && (route==="home"||route==="folderDetail") && !document.body.classList.contains("nuvio-modal-open");
  document.querySelectorAll('link[href*="components"], link[href*="theme-"]').forEach(link=>{if(link.disabled!==lean)link.disabled=lean;});
}
export function setUj630BrowseStyleRoute(next) {
  route=next;
  if(!observer && isUj630CollectionsEnabled() && typeof MutationObserver==="function") {
    observer=new MutationObserver(apply);observer.observe(document.body,{attributes:true,attributeFilter:["class"]});observer.observe(document.head,{childList:true});
  }
  apply();
}
