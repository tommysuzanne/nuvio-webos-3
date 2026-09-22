import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {parse} from 'acorn';
let profile='1',revision=1,session={};
function load(){let source=fs.readFileSync('js/ui/screens/library/libraryController.js','utf8');const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});for(const n of ast.body.filter(n=>n.type==='ImportDeclaration').reverse())source=source.slice(0,n.start)+source.slice(n.end);source=source.replace(/export /g,'');return vm.runInNewContext(source+';LibraryController;',{
 LibraryListPrivacy:{PRIVATE:'private',LINK:'link',FRIENDS:'friends',PUBLIC:'public'},LibrarySortOptionKey:{DEFAULT:'default',ADDED_DESC:'added_desc',ADDED_ASC:'added_asc',TITLE_ASC:'title_asc',TITLE_DESC:'title_desc'},LibrarySourceMode:{LOCAL:'local'},
 ProfileManager:{getActiveProfileId:()=>profile,getActiveProfileRevision:()=>revision},AuthManager:{getSessionSignal:()=>session},DebridSettingsStore:{subscribe:()=>()=>{}},cloudLibrarySettingsSignature:()=>'',Set,Map,clearTimeout
});}
let Controller=load();let first=new Controller();first.setState=function(patch){Object.assign(this.state,patch)};first.selectType('movie');first.dispose();
let back=new Controller();assert.equal(back.state.selectedTypeKey,'movie','detail/back retains movie filter');back.dispose();
profile='2';revision++;let other=new Controller();assert.equal(other.state.selectedTypeKey,'__all__','profile change resets filter');other.dispose();
profile='1';revision++;assert.equal(new Controller().state.selectedTypeKey,'__all__','switch away/back also resets');
let current=new Controller();current.state.selectedTypeKey='series';current.dispose();session={};assert.equal(new Controller().state.selectedTypeKey,'__all__','account session reset clears type');
current=new Controller();current.state.selectedTypeKey='movie';current.dispose();Controller=load();assert.equal(new Controller().state.selectedTypeKey,'__all__','app restart has no durable filter');
console.log('PASS Library controller filter survives remount, resets on profile/session/app change; no storage writes.');
