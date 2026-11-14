import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';

test('all 34 available outfits keep their hands, fit below the head and select without a separate charge',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.locator('[data-category="torso"]').click();
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const clothes=catalog.filter(p=>p.category==='torso');expect(clothes).toHaveLength(34);
 expect(clothes.every(p=>p.price===0&&/^torso-(catalog|plain)-\d\d$/.test(p.id))).toBe(true);
 const artwork=await page.evaluate(async list=>Promise.all(list.map(async part=>{
  const img=new Image();img.src=part.image;await img.decode();
  const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const data=ctx.getImageData(0,0,600,720).data;let outside=0,visible=0,leftHand=0,rightHand=0;
  for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]){
   visible++;if(x<139||x>=461||y<317||y>=532)outside++;
   if(y>=450&&x<220)leftHand++;if(y>=450&&x>=380)rightHand++;
  }
  return {id:part.id,w:img.width,h:img.height,outside,visible,leftHand,rightHand,collar:ctx.getImageData(300,319,1,1).data[3]};
 })),clothes);
 for(const a of artwork){
  expect([a.w,a.h],a.id).toEqual([600,720]);expect(a.outside,a.id).toBe(0);expect(a.visible,a.id).toBeGreaterThan(30000);
  expect(a.leftHand,a.id).toBeGreaterThan(500);expect(a.rightHand,a.id).toBeGreaterThan(500);expect(a.collar,a.id).toBeGreaterThanOrEqual(245);
 }
 const before=await page.locator('#total').innerText();
 for(const part of clothes){
  const card=page.locator(`[data-part="${part.id}"]`);await card.click();await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',part.image);await expect(page.locator('#total')).toHaveText(before);
 }
 await page.reload();await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',clothes.at(-1).image);
 expect(errors).toEqual([]);
});

test('a retired trial outfit resets to the new blazer and preserves all other choices',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({torso:'torso-3d-black-suit',face:'face-catalog-07',hair:'hair-renewed-07',legs:'legs-catalog-21'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-06__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-07__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);
 await page.locator('[data-category="torso"]').click();await expect(page.locator('[data-part="torso-3d-black-suit"]')).toHaveCount(0);
});


test('removed torso numbers restore safely without changing other selected parts',async({page})=>{
 await page.goto('/');
 for(const n of [19,13,2,1,7,8,20,21,28,9,15,40]){
  await page.evaluate(n=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({torso:'torso-catalog-'+String(n).padStart(2,'0'),face:'face-catalog-07',hair:'hair-renewed-07',legs:'legs-catalog-21'})),n);
  await page.reload();await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-06__/);
  await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 }
});

test('nine plain colors persist and export their selected torso without extra charge',async({page})=>{
 test.setTimeout(90_000);await page.goto('/');
 const tops=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.id.startsWith('torso-plain-')));expect(tops).toHaveLength(9);
 for(const top of tops){
  await page.locator('[data-category="torso"]').click();await page.locator(`[data-part="${top.id}"]`).click();await page.reload();
  await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',top.image);await expect(page.locator('#total')).toHaveText(/550/);
  const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await(await pending).failure()).toBeNull();
  const delta=await page.evaluate(async src=>{
   const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
   const imgs=await Promise.all([load(src),load(document.querySelector('#test-figure-png').href)]);
   const data=imgs.map(i=>{const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(i,0,0,600,720);return ctx.getImageData(270,370,60,60).data;});
   let sum=0;for(let i=0;i<data[0].length;i+=4)for(let j=0;j<3;j++)sum+=Math.abs(data[0][i+j]-data[1][i+j]);return sum/(60*60*3);
  },top.image);expect(delta).toBeLessThan(8);
 }
});

test('twenty detailed printed torsos preserve their selected print in PNG',async({page})=>{
 test.setTimeout(120_000);await page.goto('/');
 const tops=await page.evaluate(async()=>(await import('./catalog.js')).default.filter(p=>p.category==='torso'&&p.id.startsWith('torso-catalog-')&&![25,26,27,38,39].includes(Number(p.name.split(' · ')[0]))));
 expect(tops).toHaveLength(20);
 for(const top of tops){
  await page.locator('[data-category="torso"]').click();await page.locator(`[data-part="${top.id}"]`).click();await page.reload();
  await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',top.image);await expect(page.locator('#total')).toHaveText(/550/);
  const pending=page.waitForEvent('download');await exportDraftPng(page);expect(await(await pending).failure()).toBeNull();
  const delta=await page.evaluate(async src=>{
   const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
   const imgs=await Promise.all([load(src),load(document.querySelector('#test-figure-png').href)]);
   const data=imgs.map(i=>{const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(i,0,0,600,720);return ctx.getImageData(260,350,80,120).data;});
   let sum=0;for(let i=0;i<data[0].length;i+=4)for(let j=0;j<3;j++)sum+=Math.abs(data[0][i+j]-data[1][i+j]);return sum/(80*120*3);
  },top.image);expect(delta,top.id).toBeLessThan(10);
 }
});

test('detailed torsos have transparent arm gaps in assets and exported PNGs',async({page})=>{
 test.setTimeout(90_000);await page.goto('/');
 const failures=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default;
  const {initialSelection}=await import('./parts.js');
  const {createFigurePng}=await import('./export-image.js');
  const torsos=catalog.filter(p=>p.category==='torso'&&p.id.startsWith('torso-catalog-')&&![25,26,27,38,39].includes(Number(p.name.split(' · ')[0])));
  const failures=[];
  const check=async(src,id,scale)=>{
   const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
   for(const x of [213,386]){const data=ctx.getImageData(x*scale,450*scale,scale,25*scale).data;if(data.some((v,i)=>i%4===3&&v>2))failures.push(id+': opaque arm gap at '+x);}
  };
  for(const torso of torsos){
   await check(torso.image,torso.id,1);
   const blob=await createFigurePng({...initialSelection,torso:torso.id},catalog),url=URL.createObjectURL(blob);
   try{await check(url,torso.id+' PNG',2);}finally{URL.revokeObjectURL(url);}
  }
  return {count:torsos.length,failures};
 });
 expect(failures.count).toBe(20);expect(failures.failures).toEqual([]);
});
