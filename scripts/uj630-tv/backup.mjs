import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {connect} from './client.mjs';
const output=path.resolve(process.argv[2]||'../private/tv-before-install.json');
const tv=await connect();
try{
 const values=await tv.eval(`(function(){var result={},names=['collectionsState','homeCatalogPrefs','layoutPreferences','watchProgressItems','continueWatchingPreferences','nuvioDevicePerformance','playerSettings','tmdbSettings','mdbListSettings','profiles','installedAddonUrls','installedAddonDisplayNames','installedAddonEnabledStates'];for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(/watch|progress/i.test(key)&&names.indexOf(key)<0)names.push(key)}for(var j=0;j<names.length;j++){var value=localStorage.getItem(names[j]);if(value!==null)result[names[j]]=value}return result})()`);
 if(!values.collectionsState||!values.profiles)throw Error('Required backup surfaces missing');
 Object.values(values).forEach(value=>JSON.parse(value));
 const backup=JSON.stringify({createdAt:new Date().toISOString(),appId:'space.nuvio.webos',values},null,2);
 fs.mkdirSync(path.dirname(output),{recursive:true,mode:0o700});fs.writeFileSync(output,backup,{mode:0o600});
 if(fs.readFileSync(output,'utf8')!==backup)throw Error('Backup verification failed');
 console.log(JSON.stringify({backupVerified:true,surfaces:Object.keys(values).length,bytes:Buffer.byteLength(backup),sha256:crypto.createHash('sha256').update(backup).digest('hex')}));
}finally{tv.close()}
