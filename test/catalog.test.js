import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,rename} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectParts,folders,imageSize} from '../scripts/build.mjs';
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 720"><rect x="224" y="190" width="152" height="130"/></svg>';
async function fixture(fn){const root=await mkdtemp(path.join(os.tmpdir(),'teuilor-catalog-'));try{for(const f of Object.keys(folders)){await mkdir(path.join(root,f));await writeFile(path.join(root,f,'test__250__Деталь.svg'),f==='skirts'?svg.replace('<svg ','<svg data-skirt-mode="overlay" '):svg);}await fn(root);}finally{await rm(root,{recursive:true,force:true});}}
test('discovers all folders and encodes file URLs for GitHub project pages',()=>fixture(async root=>{
 const parts=await collectParts(root);assert.equal(parts.length,Object.keys(folders).length);
 assert.equal(parts[0].id,'hair-test');assert.equal(parts[0].price,250);assert.equal(parts[0].name,'Деталь');
 assert.equal(parts[0].image,'./haircuts/test__250__%D0%94%D0%B5%D1%82%D0%B0%D0%BB%D1%8C.svg');
}));
test('changing filename price/title preserves the identifier',()=>fixture(async root=>{
 await rename(path.join(root,'haircuts/test__250__Деталь.svg'),path.join(root,'haircuts/test__400__Локоны.svg'));
 const [part]=await collectParts(root);assert.equal(part.id,'hair-test');assert.equal(part.price,400);assert.equal(part.name,'Локоны');
}));
test('imports bounded thumbnail view boxes and rejects invalid crop metadata',()=>fixture(async root=>{
 const file=path.join(root,'accessories/test__250__Деталь.svg');
 await writeFile(file,svg.replace('viewBox="0 0 600 720"','viewBox="0 0 600 720" data-preview-box="20 500 140 190"'));
 assert.equal((await collectParts(root)).find(p=>p.category==='accessory').previewBox,'20 500 140 190');
 for(const box of ['-1 0 20 20','590 500 140 190','0 0 0 20','0 0 NaN 20','0 0 20 20 20','bad']){
  await writeFile(file,svg.replace('viewBox="0 0 600 720"',`viewBox="0 0 600 720" data-preview-box="${box}"`));
  await assert.rejects(collectParts(root),/неверная область предпросмотра/);
 }
}));

test('hair back layers must be local, valid and fit the shared canvas',()=>fixture(async root=>{
 const dir=path.join(root,'assets/hair-backs');await mkdir(dir,{recursive:true});
 const back=path.join(dir,'test.svg'),file=path.join(root,'haircuts/test__250__Деталь.svg');
 const front=svg.replace('viewBox="0 0 600 720"','viewBox="0 0 600 720" data-back-image="./assets/hair-backs/test.svg"');
 await writeFile(back,svg);await writeFile(file,front);
 assert.equal((await collectParts(root))[0].backImage,'./assets/hair-backs/test.svg');
 await writeFile(file,front.replace('./assets/hair-backs/test.svg','https://example.com/hair.svg'));
 await assert.rejects(collectParts(root),/неверный задний слой/);
 await writeFile(file,front);await writeFile(back,svg.replace('600 720','300 300'));
 await assert.rejects(collectParts(root),/неверный размер заднего слоя/);
 await rm(back);await assert.rejects(collectParts(root),/ENOENT/);
}));
test('updated artwork versions refresh both hair layers without changing saved IDs',()=>fixture(async root=>{
 const dir=path.join(root,'assets/hair-backs');await mkdir(dir,{recursive:true});
 await writeFile(path.join(dir,'test.svg'),svg);
 const file=path.join(root,'haircuts/test__250__Деталь.svg');
 const front=svg.replace('viewBox="0 0 600 720"','viewBox="0 0 600 720" data-back-image="./assets/hair-backs/test.svg" data-asset-version="fit-2"');
 await writeFile(file,front);
 const [part]=await collectParts(root);
 assert.equal(part.id,'hair-test');assert.ok(part.image.endsWith('?v=fit-2'));
 assert.equal(part.backImage,'./assets/hair-backs/test.svg?v=fit-2');
 await writeFile(file,front.replace('fit-2','../../other?x=1'));
 await assert.rejects(collectParts(root),/неверная версия изображения/);
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
 await rm(path.join(root,'altars'),{recursive:true});
 await rm(path.join(root,'suits'),{recursive:true});
 await rm(path.join(root,'skirts'),{recursive:true});
 await rm(path.join(root,'transport'),{recursive:true});
 await rm(path.join(root,'children'),{recursive:true});
 const parts=await collectParts(root);assert.equal(parts.length,4);
 assert.ok(parts.every(p=>!['suit','accessory','animal','altar'].includes(p.category)));
}));

test('reserves the empty-choice identifiers for optional categories',()=>fixture(async root=>{
 await writeFile(path.join(root,'animals/none__200__Кот.svg'),svg);
 await assert.rejects(collectParts(root),/повторяется идентификатор animal-none/);
}));

test('suit inclusions are imported as labels without creating additional paid parts',()=>fixture(async root=>{
 const file=path.join(root,'suits/test__250__Деталь.svg');
 await writeFile(file,svg.replace('viewBox="0 0 600 720"','viewBox="0 0 600 720" data-included-label="Рюкзак в комплекте"'));
 const catalog=await collectParts(root),suit=catalog.find(p=>p.category==='suit');
 assert.equal(suit.includedLabel,'Рюкзак в комплекте');assert.equal(suit.price,250);
 assert.equal(catalog.length,Object.keys(folders).length);
 await writeFile(file,svg.replace('viewBox="0 0 600 720"','viewBox="0 0 600 720" data-included-label=""'));
 await assert.rejects(collectParts(root),/неверная подпись комплекта/);
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

test('skirt behavior must explicitly distinguish overlays from leg replacements',()=>fixture(async root=>{
 const file=path.join(root,'skirts/test__250__Деталь.svg');
 for(const mode of ['overlay','replace-legs']){
  await writeFile(file,svg.replace('<svg ',`<svg data-skirt-mode="${mode}" `));
  assert.equal((await collectParts(root)).find(p=>p.category==='skirt').skirtMode,mode);
 }
 await writeFile(file,svg);await assert.rejects(collectParts(root),/data-skirt-mode/);
 await writeFile(file,svg.replace('<svg ','<svg data-skirt-mode="unknown" '));await assert.rejects(collectParts(root),/неверный режим юбки/);
 await writeFile(file,svg.replace('<svg ','<svg data-skirt-mode="overlay" '));
 await writeFile(path.join(root,'pants/test__250__Деталь.svg'),svg.replace('<svg ','<svg data-skirt-mode="overlay" '));
 await assert.rejects(collectParts(root),/неверный режим юбки/);
}));

test('hair display order is independent of permanent numbers and rejects invalid metadata',()=>fixture(async root=>{
 const first=path.join(root,'haircuts/test__250__Деталь.svg');
 await writeFile(first,svg.replace('<svg ','<svg data-catalog-order="2" '));
 await writeFile(path.join(root,'haircuts/second__250__99 · Другой.svg'),svg.replace('<svg ','<svg data-catalog-order="1" '));
 const hair=(await collectParts(root)).filter(p=>p.category==='hair');
 assert.deepEqual(hair.map(p=>p.id),['hair-second','hair-test']);
 assert.equal(hair[0].name,'99 · Другой');
 for(const order of ['0','-1','1.5','bad','10001']){
  await writeFile(first,svg.replace('<svg ',`<svg data-catalog-order="${order}" `));
  await assert.rejects(collectParts(root),/неверный порядок карточки/);
 }
}));


test('all six current altars embed the exact uploaded PNGs in the requested order',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../scripts/wedding-photo-manifest.json',import.meta.url),'utf8'));
 const parts=await collectParts(new URL('../',import.meta.url).pathname),altars=parts.filter(p=>p.category==='altar');
 assert.deepEqual(altars.map(p=>p.name),['Алтарь 1','Алтарь 2','Алтарь 3','Балкон','Беседка','Качели']);
 assert.ok(altars.every(p=>p.price===400&&/^altar-photo-0[1-6]$/.test(p.id)));
 for(const entry of manifest){
  const file=new URL(`../altars/photo-${String(entry.number).padStart(2,'0')}__400__${entry.name}.svg`,import.meta.url);
  const svg=await readFile(file,'utf8'),original=Buffer.from(svg.match(/href="data:image\/png;base64,([^"]+)"/)[1],'base64');
  assert.equal(createHash('sha256').update(original).digest('hex'),entry.sha256);
  assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
 }
});
