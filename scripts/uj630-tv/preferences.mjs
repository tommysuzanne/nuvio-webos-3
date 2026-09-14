// Explicit, targeted preferences export/restore. Authentication tokens, cookies,
// SSH credentials and unrelated localStorage entries are never selected.
import fs from 'node:fs';import path from 'node:path';import {connect} from './client.mjs';
const mode=process.argv[2],file=process.argv[3];
if(!['backup','restore'].includes(mode)||!file)throw Error('Usage: preferences.mjs backup|restore /path/private.json');
const keys=['collectionsState','homeCatalogPrefs','layoutPreferences','watchProgressItems','continueWatchingPreferences','nuvioDevicePerformance','playerSettings','tmdbSettings','mdbListSettings','profiles','installedAddonUrls','installedAddonDisplayNames','installedAddonEnabledStates'];
let snapshot;if(mode==='restore'){
 snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
 if(snapshot.appId!=='space.nuvio.webos'||!snapshot.values||typeof snapshot.values!=='object')throw Error('Invalid targeted backup');
 for(const [key,value]of Object.entries(snapshot.values))if(!keys.includes(key)||(value!==null&&typeof value!=='string'))throw Error('Backup contains a disallowed entry');
}
const tv=await connect();
try{
 if(mode==='backup'){
  const values=await tv.eval(`(function(){var values={};${JSON.stringify(keys)}.forEach(function(key){values[key]=localStorage.getItem(key)});return values})()`);
  const directory=path.dirname(path.resolve(file));fs.mkdirSync(directory,{recursive:true,mode:0o700});
  fs.writeFileSync(file,JSON.stringify({createdAt:new Date().toISOString(),appId:'space.nuvio.webos',values},null,2),{mode:0o600});fs.chmodSync(file,0o600);
  console.log('Targeted private backup saved; values are not printed.');
 }else{
  await tv.eval(`(function(){var values=${JSON.stringify(snapshot.values)};Object.keys(values).forEach(function(key){if(values[key]===null)localStorage.removeItem(key);else localStorage.setItem(key,values[key]);});return true})()`);
  console.log('Targeted preferences restored. Close and reopen Nuvio to reload the stores.');
 }
}finally{tv.close()}
