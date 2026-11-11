import {exportDraftPng} from './helpers/figure-export.js';
import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test('all renewed hairstyles keep facial features clear, cover the stud and retain complete silhouettes',async({page})=>{
 await page.goto('/');
 const failures=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,failures=[];
  const hairs=catalog.filter(p=>p.category==='hair');
  if(hairs.length!==55||hairs.filter(p=>p.id.startsWith('hair-renewed-')).length!==53||hairs.filter(p=>/hair-catalog-cap-(black|white)$/.test(p.id)).length!==2)failures.push('obsolete or missing hairstyles');
  for(const hair of hairs){
   const image=new Image();image.src=hair.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const pixels=ctx.getImageData(0,0,600,720).data;
   for(const [x,y] of [[274,232],[326,232],[274,250],[326,250],[300,277],[274,293],[326,293]])
    if(pixels[(y*600+x)*4+3]!==0)failures.push(hair.id+': obscured facial feature');
   if(pixels[(182*600+300)*4+3]<245)failures.push(hair.id+': exposed stud');
   const [x,y,w,h]=hair.previewBox.split(' ').map(Number);let outside=0,count=0,left=600,right=0,top=720;
   for(let py=0;py<720;py++)for(let px=0;px<600;px++)if(pixels[(py*600+px)*4+3]>32){count++;left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);if(px<x||py<y||px>=x+w||py>=y+h)outside++;}
   if(!count||outside)failures.push(hair.id+': empty or cropped preview');
   if(hair.id.startsWith('hair-renewed-')){
    const number=Number(hair.name.split(' · ')[0]);
    const maxWidth=[31,32,33].includes(number)?253:[34,35,36,37].includes(number)?236:[49,50,51,52,53].includes(number)?226:220;
    if(right-left+1>maxWidth||top<115)failures.push(hair.id+': oversized on the 152px head');
    const centers=[];
    for(let py=175;py<210;py++){
     let l=600,r=0,count=0;for(let px=0;px<600;px++)if(pixels[(py*600+px)*4+3]>40){l=Math.min(l,px);r=px;count++;}
     if(count>30)centers.push((l+r)/2);
    }
    centers.sort((a,b)=>a-b);
    if(!centers.length||Math.abs(centers[Math.floor(centers.length/2)]-300)>10)failures.push(hair.id+': crown shifted off the head');
    if(['hair-renewed-02','hair-renewed-41','hair-renewed-48'].includes(hair.id)&&y+h-6>395)failures.push(hair.id+': straight locks longer than the physical reference');
   }
  }
  return failures;
 });
 expect(failures).toEqual([]);
});

test('all hairstyles select independently, keep the correct price and export long and short hair',async({page})=>{
 test.setTimeout(90_000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const hairs=catalog.filter(p=>p.category==='hair');expect(hairs.length).toBeGreaterThan(0);
 const start=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 const base=550;
 for(const hair of hairs){
  const card=page.locator(`[data-part="${hair.id}"]`);await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',hair.image);
  await expect(page.locator('#figure [data-layer="hair-back"]')).toHaveCount(hair.backImage?1:0);
  if(hair.backImage){
   await expect(page.locator('#figure image').first()).toHaveAttribute('data-layer','hair-back');
   await expect(card.locator('[data-layer="hair-back"]')).toHaveCount(1);
  }
  expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(base+hair.price);
 }
 for(const id of ['hair-renewed-07','hair-renewed-14','hair-renewed-08','hair-renewed-17','hair-catalog-cap-white','hair-catalog-cap-black']){
  await page.locator(`[data-part="${id}"]`).click();
  const pending=page.waitForEvent('download');await exportDraftPng(page);
  const download=await pending;expect(await download.failure()).toBeNull();
  const bytes=await readFile(await download.path());expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
  const center=await page.evaluate(async()=>{
   const i=new Image();i.src=document.querySelector('#test-figure-png').href;await i.decode();
   const c=document.createElement('canvas');c.width=1200;c.height=1440;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
   return [...ctx.getImageData(600,530,1,1).data];
  });
  // Existing face artwork can retain fractional alpha after compositing.
  expect(center[0]).toBeGreaterThan(150);expect(center[1]).toBeGreaterThan(100);expect(center[3]).toBeGreaterThanOrEqual(245);
  await page.reload();
  await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',catalog.find(p=>p.id===id).image);
  await page.locator('[data-category="hair"]').click();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('a retired test hairstyle resets to a new style while preserving other saved details',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('teuilor-selection-v1',JSON.stringify({hair:'hair-catalog-long-caramel-center-curls',face:'face-catalog-07',torso:'torso-catalog-12',legs:'legs-catalog-21',accessory:'accessory-none',animal:'animal-none',altar:'altar-none'})));
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="hair"]')).toHaveAttribute('href',/renewed-14__/);
 await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('href',/catalog-07__/);
 await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('href',/catalog-12__/);
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-21__/);
});

test('hairline joins every head without a transparent forehead gap',async({page})=>{
 test.setTimeout(90_000);await page.goto('/');
 const failures=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,failures=[];
  const load=async p=>{const i=new Image();i.src=p.image;await i.decode();return {...p,img:i};};
  const faces=await Promise.all(catalog.filter(p=>p.category==='face').map(load));
  const hairs=await Promise.all(catalog.filter(p=>p.category==='hair').map(load));
  const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d',{willReadFrequently:true});
  for(const hair of hairs)for(const face of faces){
   ctx.clearRect(0,0,600,720);ctx.drawImage(face.img,0,0);ctx.drawImage(hair.img,0,0);
   const data=ctx.getImageData(250,200,100,28).data;
   if(data.some((value,index)=>index%4===3&&value<240)){failures.push(hair.id+' + '+face.id+': forehead gap');break;}
  }
  return failures;
 });
 expect(failures).toEqual([]);
});

test('15 uses exactly the silhouette of 10 in black and 28 retains its natural proportions',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default;
  const find=n=>catalog.find(p=>p.category==='hair'&&p.name.startsWith(n+' ·'));
  const pixels=async part=>{const i=new Image();i.src=part.image;await i.decode();const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return ctx.getImageData(0,0,600,720).data;};
  const [brown,black]=await Promise.all([pixels(find('10')),pixels(find('15'))]);
  let alphaDifference=0,blackLight=0,brownLight=0,count=0,nonNeutral=0;
  for(let i=0;i<brown.length;i+=4){
   alphaDifference=Math.max(alphaDifference,Math.abs(brown[i+3]-black[i+3]));
   if(brown[i+3]>245){count++;brownLight+=brown[i]+brown[i+1]+brown[i+2];blackLight+=black[i]+black[i+1]+black[i+2];if(Math.max(black[i],black[i+1],black[i+2])-Math.min(black[i],black[i+1],black[i+2])>1)nonNeutral++;}
  }
  const b28=find('28').previewBox.split(' ').map(Number),p27=find('27').previewBox;
  return {alphaDifference,darker:blackLight<brownLight,nonNeutral,count,ratio:(b28[2]-12)/(b28[3]-12),matched:[find('44'),find('45')].every(p=>p.previewBox===p27)};
 });
 expect(result.alphaDifference).toBeLessThanOrEqual(1);expect(result.darker).toBe(true);
 expect(result.count).toBeGreaterThan(1000);expect(result.nonNeutral).toBe(0);
 expect(result.ratio).toBeGreaterThan(1.19);expect(result.ratio).toBeLessThan(1.22);
 expect(result.matched).toBe(true);
});


test('19–21 finish at matching cheek heights and 32 is centered on the face opening',async({page})=>{
 await page.goto('/');
 const fitted=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default;
  return Promise.all(catalog.filter(p=>p.category==='hair'&&['19','20','21','32'].some(n=>p.name.startsWith(n+' ·'))).map(async part=>{
   const image=new Image();image.src=part.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,600,720).data;
   const alpha=(x,y)=>data[(y*600+x)*4+3];
   const bottom=(left,right)=>{let bottom=0;for(let y=220;y<310;y++)for(let x=left;x<right;x++)if(alpha(x,y)>128)bottom=y;return bottom;};
   const centers=[];
   for(let y=230;y<=260;y+=5){let left=300,right=300;while(left>200&&alpha(left,y)<128)left--;while(right<400&&alpha(right,y)<128)right++;centers.push((left+right)/2);}
   return {number:Number(part.name.split(' · ')[0]),left:bottom(220,240),right:bottom(360,380),centers};
  }));
 });
 expect(fitted).toHaveLength(4);
 for(const fit of fitted){
  if(fit.number===32){for(const center of fit.centers)expect(Math.abs(center-300)).toBeLessThanOrEqual(1);}
  else{expect(fit.left).toBeGreaterThan(260);expect(Math.abs(fit.left-fit.right)).toBeLessThanOrEqual(1);}
 }
});
