import test from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,rename} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {collectParts,folders,imageSize,accessoryGroups} from '../scripts/build.mjs';
import {replacePreparedHair} from '../scripts/prepare-renewed-hair.mjs';
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
 await rm(path.join(root,'additional'),{recursive:true});
 const parts=await collectParts(root);assert.equal(parts.length,4);
 assert.ok(parts.every(p=>!['suit','accessory','animal','altar','additional'].includes(p.category)));
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

test('animal ordering uses explicit catalog order while preserving permanent IDs',()=>fixture(async root=>{
 const folder=path.join(root,'animals');
 await writeFile(path.join(folder,'test__250__Деталь.svg'),svg.replace('<svg ','<svg data-catalog-order="500" '));
 await writeFile(path.join(folder,'z-cat__200__Кошка.svg'),svg.replace('<svg ','<svg data-catalog-order="101" '));
 await writeFile(path.join(folder,'a-dog__200__Собака.svg'),svg.replace('<svg ','<svg data-catalog-order="401" '));
 assert.deepEqual((await collectParts(root)).filter(p=>p.category==='animal').map(p=>p.id),['animal-z-cat','animal-a-dog','animal-test']);
 await writeFile(path.join(folder,'z-cat__200__Кошка.svg'),svg.replace('<svg ','<svg data-catalog-order="0" '));await assert.rejects(collectParts(root),/неверный порядок карточки/);
}));

test('seven additional original hairpieces retain numbers, zero prices and requested neighbors',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../scripts/additional-hair-manifest.json',import.meta.url),'utf8'));
 const hair=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.category==='hair');
 assert.equal(hair.length,70);
 assert.deepEqual(manifest.map(p=>p.displayNumber),[56,57,58,59,60,61,62]);
 const index=id=>hair.findIndex(p=>p.id===id);
 assert.equal(index('hair-glossy-02'),index('hair-renewed-53')+1);
 assert.equal(index('hair-glossy-07'),index('hair-glossy-01')+1);
 assert.equal(index('hair-glossy-05'),index('hair-glossy-04')+1);
 assert.equal(index('hair-glossy-04'),index('hair-glossy-03')+1);
 const oldManifest=JSON.parse(await readFile(new URL('../scripts/renewed-hair-manifest.json',import.meta.url),'utf8'));
 const old=hair.filter(p=>p.id.startsWith('hair-renewed-'));
 assert.deepEqual(old.map(p=>p.id),[...oldManifest].sort((a,b)=>a.catalogOrder-b.catalogOrder).map(p=>'hair-renewed-'+String(p.number).padStart(2,'0')));
 for(const part of oldManifest)assert.ok(old.find(p=>p.id==='hair-renewed-'+String(part.number).padStart(2,'0')).name.startsWith(String(part.displayNumber).padStart(2,'0')+' · '));
 for(const entry of manifest){
  const part=hair.find(p=>p.id==='hair-'+entry.slug);
  assert.equal(part.name,entry.displayNumber+' · '+entry.name);
  assert.equal(part.price,0);
  assert.equal(part.catalogOrder,entry.catalogOrder);
  assert.match(part.image,/\?v=[a-f0-9]{12}$/);
 }
});

test('reimporting the original hair collection preserves later styles, caps and back layers',()=>fixture(async root=>{
 const hair=path.join(root,'haircuts'),staged=path.join(root,'staged');await mkdir(staged);
 const keep=['glossy-01__0__56 · Светлая.svg','catalog-cap-white__0__54 · Кепка.svg'];
 for(const name of keep)await writeFile(path.join(hair,name),'preserve '+name);
 const backs=path.join(root,'assets/hair-backs');await mkdir(backs,{recursive:true});await writeFile(path.join(backs,'later.svg'),'back layer');
 await writeFile(path.join(hair,'renewed-01__0__Старое имя.svg'),'old artwork');
 const fresh='renewed-01__0__Новое имя.svg';await writeFile(path.join(staged,fresh),'new artwork');
 replacePreparedHair(staged,hair);
 for(const name of keep)assert.equal(await readFile(path.join(hair,name),'utf8'),'preserve '+name);
 assert.equal(await readFile(path.join(hair,fresh),'utf8'),'new artwork');
 await assert.rejects(readFile(path.join(hair,'renewed-01__0__Старое имя.svg')),/ENOENT/);
 assert.equal(await readFile(path.join(backs,'later.svg'),'utf8'),'back layer');
}));


test('headwear is numbered 63–69 and included in the figure price',async()=>{
 const hair=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.id.startsWith('hair-headwear-'));
 assert.equal(hair.length,7);
 assert.deepEqual(hair.map(p=>Number(p.name.split(' · ')[0])),[63,64,65,66,67,68,69]);
 assert.ok(hair.every(p=>p.price===0&&p.previewBox));
});

test('sixteen additional suits preserve the original collection and stable numbering',async()=>{
 const suits=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.category==='suit');
 assert.equal(suits.length,64);
 assert.ok(!suits.some(p=>p.id==='suit-catalog-41'));
 assert.equal(suits.filter(p=>p.id.startsWith('suit-catalog-')).length,48);
 const added=suits.filter(p=>p.id.startsWith('suit-additional-'));
 assert.deepEqual(added.map(p=>Number(p.name.split(' · ')[0])),Array.from({length:16},(_,i)=>50+i));
 assert.ok(added.every(p=>p.price===550&&p.previewBox==='133 311 334 391'));
});

test('eight additional faces preserve previous heads and source order without extra charge',async()=>{
 const faces=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.category==='face');
 assert.equal(faces.length,74);assert.equal(faces.filter(p=>p.id.startsWith('face-catalog-')).length,66);
 const added=faces.filter(p=>p.id.startsWith('face-additional-'));
 assert.deepEqual(added.map(p=>Number(p.name.split(' · ')[0])),[67,68,69,70,71,72,73,74]);
 assert.ok(added.every(p=>p.price===0&&p.previewBox==='218 167 164 159'));
});

test('torso catalog removes retired IDs and groups solid colors before prints and medical clothing',async()=>{
 const config=JSON.parse(await readFile(new URL('../scripts/plain-torsos/order.json',import.meta.url),'utf8'));
 const tops=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.category==='torso');
 assert.equal(tops.length,34);
 const numbers=tops.map(p=>Number(p.name.split(' · ')[0]));
 assert.deepEqual(numbers,config.groups.flatMap(g=>g.numbers));
 for(const n of config.retired)assert.ok(!numbers.includes(n));
 assert.equal(tops.filter(p=>p.id.startsWith('torso-plain-')).length,9);
 assert.ok(tops.every(p=>p.price===0));
 const medical=[31,32,33,36,37];assert.deepEqual(numbers.slice(numbers.indexOf(31),numbers.indexOf(31)+5),medical);
});

test('upper pants masking metadata is accepted only on torsos with a valid boundary',()=>fixture(async root=>{
 const file=path.join(root,'clothes/test__250__Деталь.svg');
 await writeFile(file,svg.replace('<svg ','<svg data-legs-top="510" '));
 assert.equal((await collectParts(root)).find(p=>p.category==='torso').legsTop,510);
 for(const value of ['0','720','-1','510.5','bad']){
  await writeFile(file,svg.replace('<svg ',`<svg data-legs-top="${value}" `));await assert.rejects(collectParts(root),/граница брюк/);
 }
 await writeFile(file,svg);
 await writeFile(path.join(root,'pants/test__250__Деталь.svg'),svg.replace('<svg ','<svg data-legs-top="510" '));
 await assert.rejects(collectParts(root),/граница брюк/);
}));

test('original uploaded torso sheets and reviewed masks are preserved with native-resolution cutouts',async()=>{
 const base=new URL('../scripts/original-torsos/',import.meta.url);
 const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
 assert.deepEqual(manifest.items.map(p=>p.number).sort((a,b)=>a-b),[4,5,6,11,12,16,17,18,22,23,24,29,30,31,32,33,34,35,36,37]);
 for(const [name,hash] of Object.entries(manifest.sources))assert.equal(createHash('sha256').update(await readFile(new URL(name+'.webp',base))).digest('hex'),hash);
 for(const item of manifest.items){
  const mask=await readFile(new URL('masks/'+String(item.number).padStart(2,'0')+'.png',base));
  assert.equal(createHash('sha256').update(mask).digest('hex'),item.maskSha256);
  const [,,width,height]=item.box;assert.deepEqual(imageSize(mask,'.png'),{width,height});
  const svg=await readFile(new URL('../clothes/catalog-'+String(item.number).padStart(2,'0')+'__0__'+item.title+'.svg',import.meta.url),'utf8');
  const raster=Buffer.from(svg.match(/href="data:image\/png;base64,([^"]+)"/)[1],'base64');
  assert.deepEqual(imageSize(raster,'.png'),{width,height});
  assert.doesNotMatch(svg,/<filter|feColor|feBlend/);
 }
});

test('accessories keep related items adjacent without changing prices or IDs',async()=>{
 const accessories=(await collectParts(new URL('../',import.meta.url).pathname)).filter(p=>p.category==='accessory');
 assert.equal(accessories.length,71);
 const ids=accessories.map(p=>p.id),position=slug=>ids.indexOf('accessory-catalog-'+slug);
 for(const group of accessoryGroups){
  const positions=group.slugs.map(position);assert.ok(positions.every(i=>i>=0),group.name);
  assert.deepEqual(positions,Array.from({length:positions.length},(_,i)=>positions[0]+i),group.name);
 }
 assert.equal(position('basketball'),position('football')+1);
 assert.equal(position('briefcase-black'),position('briefcase-brown')+1);
 for(const accessory of accessories)assert.equal(accessory.price,/^accessory-catalog-heart-(white|red|pink)$/.test(accessory.id)?15:100);
});
