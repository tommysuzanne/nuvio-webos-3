import assert from 'node:assert/strict';import{fixedViewportCss}from'./fixedViewportCss.mjs';
const css='.card{width:15.625vw;height:calc(100% - 2.5vw);top:2vh;background:url("a-10vw.png");content:"10vw"}';
const full=await fixedViewportCss(css,1920,1080),small=await fixedViewportCss(css,1280,720);
assert(full.includes('width:300px'));assert(full.includes('100% - 48px'));assert(full.includes('top:21.6px'));assert(small.includes('width:200px'));assert(small.includes('100% - 32px'));assert(full.includes('a-10vw.png'));assert(full.includes('content:"10vw"'));
console.log('PASS: fixed 1080/720 geometry, percentages, URLs and literal content preserved.');
