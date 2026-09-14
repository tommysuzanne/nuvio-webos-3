import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const text=fs.readFileSync(new URL('../js/ui/components/uj630BrowseWindow.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
const {range,View}=vm.runInNewContext(text+';({range:visibleRange,View:Uj630BrowseWindow})',{Math,Map,Set,Array,Number});
const check=(count,x,width,stride,expected)=>assert.deepEqual(Array.from(range(count,x,width,stride)),expected);
check(10000,0,1500,320,[0,7]);check(10000,3199680,1500,320,[9997,10000]);check(0,0,1500,320,[0,0]);
const classes=new Set();const node={id:'card',classList:{contains:c=>classes.has(c),add:c=>classes.add(c),remove:c=>classes.delete(c)}};
let headerFocused=true;const header={classList:{remove:()=>headerFocused=false}};
const main={focus(){},setAttribute(){}};
const view={cardTasks:new Map(),rows:[{key:'row',items:[{id:'a'}]}],focus:{row:0,col:0},currentNode:node,main,
  mounted:new Map([['row',{cards:new Map([[0,{node}]])}]]),screen:{container:{querySelectorAll:()=>[header]}},updateWindow(){}};
const context=vm.createContext({document:{activeElement:main},Math,Map,Set,Array,Number});
const Code=vm.runInContext(text+';Uj630BrowseWindow;',context);
assert.equal(Code.prototype.focusCurrent.call(view,false),true);assert(classes.has('focused'));assert.equal(headerFocused,false,'Returning from header restores same logical card and clears header focus');
console.log('PASS: 10000 logical cards, bounded windows, empty rows and focus restoration from header.');
const frames=[];context.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
let made=0;const scheduled={disposed:false,cardFrame:0,cardTasks:new Map([[1,{priority:1}],[2,{priority:0}],[3,{priority:1}]]),materializeCard(task){made++;for(const [key,value] of this.cardTasks)if(value===task)this.cardTasks.delete(key);},scheduleCard:Code.prototype.scheduleCard};
scheduled.scheduleCard();assert.equal(frames.length,1);frames.shift()();assert.equal(made,1,'One background DOM card per frame');while(frames.length)frames.shift()();assert.equal(made,3);assert.equal(scheduled.cardTasks.size,0);assert.equal(scheduled.cardFrame,0);
console.log('PASS: deferred DOM creation is limited to one card per frame and stops when idle.');
const signature=vm.runInContext('uj630CardSignature',context);
const original={id:'one',poster:'poster.jpg',coverImageUrl:'custom.jpg',title:'Title',positionMs:1000,durationMs:10000};
for(const changed of [{coverImageUrl:'new.jpg'},{coverEmoji:'X'},{durationMs:20000},{season:2},{addonBaseUrl:'changed-source'}]){
 assert.notEqual(signature(original),signature({...original,...changed}),'Synchronized artwork/progress/action changes must update the mounted card');
}
assert.equal(signature(original),signature({...original,description:'Metadata not drawn on this card'}));
console.log('PASS: custom cover changes remain detectable when a poster also exists; progress and action changes refresh only affected cards.');
