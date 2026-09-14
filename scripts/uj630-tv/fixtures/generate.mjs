// Synthetic fixtures only. Never reads a film, credential or user library.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {execFileSync} from 'node:child_process';
const root=path.resolve(process.env.NUVIO_FIXTURES_DIR||path.dirname(fileURLToPath(import.meta.url)));
fs.mkdirSync(root,{recursive:true});const ffmpeg=process.env.FFMPEG||'ffmpeg';
const run=args=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-n',...args],{cwd:root,stdio:'inherit'});
if(!fs.existsSync(path.join(root,'h264.mp4')))run(['-f','lavfi','-i','testsrc2=size=1280x720:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','15','-c:v','libx264','-preset','veryfast','-crf','21','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-movflags','+faststart','h264.mp4']);
if(!fs.existsSync(path.join(root,'hevc.mp4')))run(['-i','h264.mp4','-c:v','libx265','-preset','fast','-x265-params','log-level=error:pools=4','-crf','26','-tag:v','hvc1','-c:a','copy','-movflags','+faststart','hevc.mp4']);
if(!fs.existsSync(path.join(root,'hls.m3u8')))run(['-i','h264.mp4','-c','copy','-hls_time','5','-hls_list_size','0','-hls_segment_filename','hls%d.ts','hls.m3u8']);
if(!fs.existsSync(path.join(root,'audio-fr-en.mp4')))run(['-i','h264.mp4','-f','lavfi','-i','sine=frequency=880:sample_rate=48000','-map','0:v','-map','0:a','-map','1:a','-t','15','-c:v','copy','-c:a','aac','-metadata:s:a:0','language=fra','-metadata:s:a:1','language=eng','-disposition:a:0','default','-disposition:a:1','0','-movflags','+faststart','audio-fr-en.mp4']);
if(!fs.existsSync(path.join(root,'audio-en-fr.mp4')))run(['-i','audio-fr-en.mp4','-map','0:v:0','-map','0:a:1','-map','0:a:0','-c','copy','-disposition:a:0','default','-disposition:a:1','0','-metadata:s:a:0','language=eng','-metadata:s:a:1','language=fra','audio-en-fr.mp4']);
if(!fs.existsSync(path.join(root,'delay.vtt')))fs.writeFileSync(path.join(root,'delay.vtt'),'WEBVTT\n\n00:00:01.000 --> 00:00:04.000\nSous-titre de validation 1\n\n00:00:05.000 --> 00:00:08.000\nSous-titre de validation 2\n\n00:00:09.000 --> 00:00:12.000\nSous-titre de validation 3\n');
if(process.argv.includes('--long')&&!fs.existsSync(path.join(root,'continuous-31min.mp4')))run(['-stream_loop','-1','-i','h264.mp4','-t','1860','-c','copy','-movflags','+faststart','continuous-31min.mp4']);
console.log('Synthetic fixtures ready. The optional 31-minute file requires roughly 1.5 GB.');
