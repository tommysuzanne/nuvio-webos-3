// Read only literal configuration values from an existing trusted local IPK's
// extracted nuvio.env.js. Do not execute the script or print its values.
import fs from 'node:fs';import {parse} from 'acorn';
const src=fs.readFileSync(process.argv[2],'utf8');const ast=parse(src,{ecmaVersion:'latest'});let env;
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='ObjectExpression'&&node.properties.some(p=>(p.key?.name||p.key?.value)==='NUVIO_SUPABASE_URL')){env={};for(const p of node.properties){if(p.type!=='Property'||p.value.type!=='Literal')throw Error('Nonliteral runtime configuration');env[p.key.name||p.key.value]=p.value.value;}}for(const v of Object.values(node)){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}}
walk(ast);if(!env)throw Error('Shipped configuration not found');delete env.NUVIO_BUILD_LABEL;
const escape=v=>String(v).replaceAll('\\','\\\\').replace(/[\r\n]/g,'');
fs.writeFileSync('local.properties',Object.entries(env).map(([k,v])=>k+'='+escape(v)).join('\n')+'\n',{mode:0o600});fs.chmodSync('local.properties',0o600);console.log('Original runtime configuration preserved; contents not displayed.');
