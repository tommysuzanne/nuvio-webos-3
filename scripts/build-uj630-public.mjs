import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=process.argv[2];
if (arg && arg!=='--check-only') {
  const result=spawnSync(process.execPath,[path.join(root,'scripts/build-uj630.mjs'),path.resolve(arg)],{cwd:root,stdio:'inherit',env:{...process.env,NUVIO_UI_RESOLUTION:'1920x1080',NUVIO_BUILD_LABEL:process.env.NUVIO_BUILD_LABEL||'webos3-public.45'}});
  if(result.error)throw result.error;
  process.exit(result.status ?? 1);
}
const properties=path.join(root,'local.properties');
let temporary=false;
if (arg==='--check-only') {
  if (fs.existsSync(properties)) throw Error('Move your private local.properties aside before running the placeholder-only build. It will not be overwritten.');
  fs.copyFileSync(path.join(root,'local.example.properties'),properties);fs.chmodSync(properties,0o600);temporary=true;
} else if (!fs.existsSync(properties)) {
  throw Error('Provide an existing compatible upstream IPK, or configure your own ignored local.properties. Use --check-only for a placeholder build which cannot authenticate.');
}
try {
  const result=spawnSync('npm',['run','package:webos'],{cwd:root,stdio:'inherit',env:{...process.env,NUVIO_FIXED_VIEWPORT:'1',NUVIO_UI_SCALE:'0.8',NUVIO_UI_RESOLUTION:'1920x1080',NUVIO_BUILD_LABEL:temporary?'uj630-public.CHECK-ONLY':process.env.NUVIO_BUILD_LABEL||'webos3-public.45',NUVIO_REQUIRE_LOCAL_PROPERTIES:'1'}});
  if(result.error)throw result.error;
  process.exitCode=result.status||0;
} finally {if(temporary)fs.unlinkSync(properties);}
