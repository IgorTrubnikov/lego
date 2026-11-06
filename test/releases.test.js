import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {versionAssets} from '../scripts/build.mjs';

test('HTML, styles, catalog and lazy imports share a version that changes with the page',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'teuilor-release-'));
 const source={'index.html':'<link href="style.css"><script type="module" src="app.js"></script>','app.js':"import './parts.js';import catalog from './catalog.js';async function save(){await import('./export-image.js');}",'parts.js':'export const parts=[];','catalog.js':'export default [];','export-image.js':"import './parts.js';",'navigation.js':'','gallery.js':'','style.css':'body{color:red}'};
 async function prepare(){for(const [file,contents] of Object.entries(source))await writeFile(path.join(root,file),contents);}
 try{
  await prepare();const first=await versionAssets(root,['index.html']);
  assert.match(await readFile(path.join(root,'index.html'),'utf8'),new RegExp('app.js\\?v='+first.version));
  for(const file of ['app.js','export-image.js']){
   const content=await readFile(path.join(root,file),'utf8');assert.ok(content.includes('./parts.js?v='+first.version));
  }
  assert.ok((await readFile(path.join(root,'app.js'),'utf8')).includes('./export-image.js?v='+first.version));
  await prepare();assert.equal((await versionAssets(root,['index.html'])).version,first.version);
  source['index.html']+='<button>New control</button>';await prepare();
  const next=await versionAssets(root,['index.html']);assert.notEqual(next.version,first.version);
  assert.ok(!(await readFile(path.join(root,'app.js'),'utf8')).includes(first.version));
 }finally{await rm(root,{recursive:true,force:true});}
});
