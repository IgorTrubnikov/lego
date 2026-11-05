import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,rename} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectParts,folders,imageSize} from '../scripts/build.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720"><rect x="224" y="190" width="152" height="130"/></svg>';
async function fixture(fn){const root=await mkdtemp(path.join(os.tmpdir(),'teuilor-catalog-'));try{for(const f of Object.keys(folders)){await mkdir(path.join(root,f));await writeFile(path.join(root,f,'test__250__Деталь.svg'),svg);}await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('discovers all folders and encodes file URLs for GitHub project pages',()=>fixture(async root=>{
 const parts=await collectParts(root);assert.equal(parts.length,Object.keys(folders).length);
 assert.equal(parts[0].id,'hair-test');assert.equal(parts[0].price,250);assert.equal(parts[0].name,'Деталь');
 assert.equal(parts[0].image,'./haircuts/test__250__%D0%94%D0%B5%D1%82%D0%B0%D0%BB%D1%8C.svg');
}));
test('changing filename price/title preserves the identifier',()=>fixture(async root=>{
 await rename(path.join(root,'haircuts/test__250__Деталь.svg'),path.join(root,'haircuts/test__400__Локоны.svg'));
 const [part]=await collectParts(root);assert.equal(part.id,'hair-test');assert.equal(part.price,400);assert.equal(part.name,'Локоны');
}));
test('rejects malformed filenames instead of silently omitting images',()=>fixture(async root=>{
 await writeFile(path.join(root,'haircuts/wrong.png'),'bad');await assert.rejects(collectParts(root),/slug__цена/);
}));
test('rejects duplicate IDs, including different prices or formats',()=>fixture(async root=>{
 await writeFile(path.join(root,'haircuts/test__300__Другая.svg'),svg);await assert.rejects(collectParts(root),/повторяется идентификатор/);
}));
test('rejects wrong canvas sizes and empty categories',()=>fixture(async root=>{
 await writeFile(path.join(root,'faces/test__250__Деталь.svg'),svg.replace('600 720','300 300'));
 await assert.rejects(collectParts(root),/600 × 720/);
 await rm(path.join(root,'faces/test__250__Деталь.svg'));await assert.rejects(collectParts(root),/хотя бы одну/);
}));
test('checks PNG and WebP canvas headers',()=>{
 const png=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.write('IHDR',12);png.writeUInt32BE(600,16);png.writeUInt32BE(720,20);
 assert.deepEqual(imageSize(png,'.png'),{width:600,height:720});assert.throws(()=>imageSize(Buffer.from('bad'),'.png'));
 const webp=Buffer.alloc(30);webp.write('RIFF');webp.writeUInt32LE(22,4);webp.write('WEBP',8);webp.write('VP8X',12);webp.writeUInt32LE(10,16);webp.writeUIntLE(599,24,3);webp.writeUIntLE(719,27,3);
 assert.deepEqual(imageSize(webp,'.webp'),{width:600,height:720});assert.throws(()=>imageSize(Buffer.from('bad'),'.webp'));
});

test('optional folders can be empty or absent',()=>fixture(async root=>{
 await rm(path.join(root,'accessories'),{recursive:true});
 await rm(path.join(root,'animals/test__250__Деталь.svg'));
 const parts=await collectParts(root);assert.equal(parts.length,4);
 assert.ok(parts.every(p=>!['accessory','animal'].includes(p.category)));
}));

test('reserves the empty-choice identifiers for optional categories',()=>fixture(async root=>{
 await writeFile(path.join(root,'animals/none__200__Кот.svg'),svg);
 await assert.rejects(collectParts(root),/повторяется идентификатор animal-none/);
}));

test('retained legacy catalog URLs keep their IDs and self-contained glossy artwork',async()=>{
 const root=new URL('../',import.meta.url);
 const original=JSON.parse(await readFile(new URL('fixtures/legacy-catalog.json',import.meta.url),'utf8'));
 const catalog=await collectParts((await import('node:url')).fileURLToPath(root));
 for(const expected of original){
  // Future intentional removals or filename/price edits remain supported.
  if(!catalog.some(p=>p.image===expected.image))continue;
  assert.deepEqual(catalog.find(p=>p.id===expected.id),expected);
  const svg=await readFile(new URL(expected.image,root),'utf8');
  assert.match(svg,/data-render-style="glossy-plastic"/);
  assert.match(svg,/data:image\/webp;base64,/);
 }
});
