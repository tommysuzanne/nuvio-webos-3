// Temporary diagnostic only. Not a deliverable or a substitute for final tests.
import {UJ630_ARTWORK} from '../../js/core/media/uj630Artwork.js';
import {connect,pause} from './client.mjs';
const tv=await connect();try{
 if(process.argv[2]==='reset'){await tv.call('Page.reload',{ignoreCache:false});console.log('Diagnostic removed by reload');}
 else{
 const result=await tv.eval(`(function(){var v=window.__NUVIO_SHARED__['js/ui/navigation/router.js'].Router.routes.home.ujBrowse,original=v.renderCard,art=${JSON.stringify(UJ630_ARTWORK)};function key(url){var hash=2166136261;for(var i=0;i<url.length;i++)hash=Math.imul(hash^url.charCodeAt(i),16777619);return (hash>>>0).toString(16)+'-'+url.length}v.renderCard=function(row,item,index,ri){var copy=Object.assign({},item);['coverImageUrl','poster','backdrop'].forEach(function(field){var raw=String(copy[field]||'');if(raw.indexOf('/image-proxy?')>=0){try{raw=new URL(raw).searchParams.get('url')||raw}catch(e){}}var baked=art[key(raw)];if(baked)copy[field]='assets/uj630-artwork/'+baked});return original.call(v,row,copy,index,ri)};v.mounted.forEach(function(entry){v.releaseRow(entry)});v.mounted.clear();v.windowDirty=true;v.updateWindow(true);return {mode:'temporary-baked-cover-diagnostic',build:window.__NUVIO_ENV__.NUVIO_BUILD_LABEL}})()`);
 console.log(result);await pause(12000);
 }
}finally{tv.close()}
