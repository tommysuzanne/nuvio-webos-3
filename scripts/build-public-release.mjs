import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const label='webos3-public.44';
const upstreamUrl='https://github.com/iqui27/NuvioTVSmart-legacy-webos/releases/download/webos3-exp.32/NuvioTV-webOS3-exp32.ipk';
const upstreamSha='5f74f091f102f490be9407e4981cf3ef4a55bee719c632f711e1506e0645a160';
const output=path.resolve(process.env.NUVIO_RELEASE_DIR||path.join(root,'../nuvio-public-release'));
if(output===root||output.startsWith(root+path.sep))throw Error('Release artifacts must stay outside sources');
const properties=path.join(root,'local.properties');
if(fs.existsSync(properties))throw Error('Move private local.properties aside; a public build never reads or overwrites it');
for(const dir of ['uj630-artwork','uj630-artwork-1080','uj630-artwork-720']) {
 if(fs.readdirSync(path.join(root,'assets',dir)).some(name=>name!=='.gitkeep'))throw Error('Remove local personal artwork before making a public release');
}
const mapping=fs.readFileSync(path.join(root,'js/core/media/uj630Artwork.js'),'utf8');
if(!/^\s*(?:\/\/[^\n]*\n)*export const UJ630_ARTWORK = \{\};\s*$/.test(mapping))throw Error('Public artwork mapping must be empty');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'nuvio-public-upstream-'));
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
try {
 let upstream;
 if(process.argv[2])upstream=fs.readFileSync(path.resolve(process.argv[2]));
 else {
  const response=await fetch(upstreamUrl,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error('Cannot download the public upstream package: HTTP '+response.status);
  upstream=Buffer.from(await response.arrayBuffer());
 }
 if(sha(upstream)!==upstreamSha)throw Error('Upstream package SHA-256 mismatch; no configuration extracted');
 const ipk=path.join(temporary,'upstream.ipk');fs.writeFileSync(ipk,upstream);
 const env={...process.env,NUVIO_BUILD_LABEL:label};
 delete env.NUVIO_LOCAL_PROPERTIES;
 delete env.NUVIO_PACKAGE_FILENAME;
 delete env.NUVIO_IPK_NAME;
 delete env.NUVIO_FORCE_UI_PLANE;
 delete env.NUVIO_DIAG_OVERLAY;
 const result=spawnSync(process.execPath,['scripts/build-uj630-public.mjs',ipk],{cwd:root,stdio:'inherit',env});
 if(result.error)throw result.error;
 if(result.status!==0)throw Error('Public package build failed');
 const packageBytes=fs.readFileSync(path.join(root,'space.nuvio.webos_1.1.2_all.ipk'));
 fs.mkdirSync(output,{recursive:true});
 const filename='Nuvio-1.1.2-webOS3-44-1080p.ipk';
 fs.writeFileSync(path.join(output,filename),packageBytes);
 fs.writeFileSync(path.join(output,'SHA256SUMS'),sha(packageBytes)+'  '+filename+'\n');
 let sourceCommit='unavailable',sourceDirty=null;
 try{
  sourceCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
  sourceDirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim().length>0;
 }catch{}
 const manifest={label,sourceCommit,sourceDirty,appId:'space.nuvio.webos',upstreamAppVersion:'1.1.2',resolution:'1920x1080',node:process.version,lockfileSha256:sha(fs.readFileSync(path.join(root,'package-lock.json'))),buildOptions:{fixedViewport:true,uiScale:0.8,uiResolution:'1920x1080'},package:{file:filename,bytes:packageBytes.length,sha256:sha(packageBytes)},configurationSource:{url:upstreamUrl,sha256:upstreamSha,scope:'Only existing public upstream client configuration; no personal settings, addon URLs, account sessions or artwork.'}};
 fs.writeFileSync(path.join(output,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log('Public release package ready: '+path.join(output,filename));
} finally {
 // The helper writes temporary upstream client configuration here, never user configuration.
 if(fs.existsSync(properties))fs.unlinkSync(properties);
 fs.rmSync(temporary,{recursive:true,force:true});
}
