import {test,expect} from '@playwright/test';

test('accessory artwork decodes transparently inside its slot and its own thumbnail bounds',async({page})=>{
 await page.goto('/');
 const checks=await page.evaluate(async()=>{
  const {default:catalog}=await import('./catalog.js');
  return Promise.all(catalog.filter(p=>p.category==='accessory').map(async p=>{
   const img=new Image();img.src=p.image;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;
   const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   const data=ctx.getImageData(0,0,600,720).data;
   const [left,top,width,height]=(p.previewBox||'15 405 150 290').split(' ').map(Number);
   let visible=0,outside=0,outsidePreview=0;
   for(let y=0;y<720;y++)for(let x=0;x<600;x++)if(data[(y*600+x)*4+3]>0){
    visible++;
    if(x<15||x>=165||y<405||y>=695)outside++;
    if(x<left||x>=left+width||y<top||y>=top+height)outsidePreview++;
   }
   return {id:p.id,size:[img.width,img.height],visible,outside,outsidePreview};
  }));
 });
 expect(checks.length).toBeGreaterThan(0);
 for(const check of checks){
  expect(check.size,check.id).toEqual([600,720]);
  expect(check.visible,check.id).toBeGreaterThan(500);
  expect(check.outside,check.id).toBe(0);
  expect(check.outsidePreview,check.id).toBe(0);
 }
});

test('retired accessories clear from saved selections without dropping other parts',async({page})=>{
 const {readFile}=await import('node:fs/promises');
 const legacy=JSON.parse(await readFile(new URL('../test/fixtures/legacy-catalog.json',import.meta.url),'utf8'));
 const {collectParts}=await import('../scripts/build.mjs');
 const {fileURLToPath}=await import('node:url');
 const catalog=await collectParts(fileURLToPath(new URL('../',import.meta.url)));
 const removed=legacy.find(p=>p.category==='accessory'&&!catalog.some(c=>c.id===p.id));
 test.skip(!removed,'No retired accessory in this catalog.');
 const snapshot=[...['hair','face','torso','legs','animal'].map(category=>catalog.find(p=>p.category===category)).filter(Boolean),removed];
 const selection=Object.fromEntries(snapshot.map(p=>[p.category,p.id]));
 const total=snapshot.reduce((sum,p)=>sum+p.price,0),expected=total-removed.price;
 await page.addInitScript(selection=>localStorage.setItem('teuilor-selection-v1',JSON.stringify(selection)),selection);
 const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="accessory"]')).toHaveCount(0);
 await page.locator('[data-category="accessory"]').click();
 await expect(page.locator('[data-part="accessory-none"]')).toHaveAttribute('aria-pressed','true');
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(expected);
 for(const part of snapshot.filter(p=>p.category!=='accessory')){
  await expect(page.locator(`#figure [data-layer="${part.category}"]`)).toHaveAttribute('href',part.image);
 }
 const first=catalog.find(p=>p.category==='accessory');
 await page.locator(`[data-part="${first.id}"]`).click();
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(expected+first.price);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-selection-v1')));
 expect(saved.accessory).toBe(first.id);
 expect(failures).toEqual([]);
});

test('six wedding accessories add to the existing catalog at 200 rubles and survive PNG export',async({page})=>{
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const accessories=catalog.filter(p=>p.category==='accessory');expect(accessories).toHaveLength(54);
 const slugs=['married-sign','flowers-red-bouquet','heart-tile','ring-box','chocolate','heart-large'];
 const amount=async()=>Number((await page.locator('#total').innerText()).replace(/\D/g,''));
 const base=await amount();await page.locator('[data-category="accessory"]').click();
 for(const slug of slugs){
  const item=accessories.find(p=>p.id===`accessory-catalog-${slug}`);expect(item).toBeTruthy();expect(item.price).toBe(200);
  await page.locator(`[data-part="${item.id}"]`).click();
  await expect(page.locator('#figure [data-layer="accessory"]')).toHaveAttribute('href',item.image);
  expect(await amount()).toBe(base+200);
 }
 await page.reload();await expect(page.locator('#figure [data-layer="accessory"]')).toHaveAttribute('href',/catalog-heart-large__/);
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 const exported=await page.evaluate(async()=>{
  const img=new Image();img.src=document.querySelector('#png-link').href;await img.decode();
  const c=document.createElement('canvas');c.width=1200;c.height=1440;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(30,810,300,580).data;let red=0;
  for(let i=0;i<pixels.length;i+=4)if(pixels[i]>150&&pixels[i+1]<90&&pixels[i+2]<90&&pixels[i+3]>128)red++;
  return {size:[img.width,img.height],red};
 });
 expect(exported.size).toEqual([1200,1440]);expect(exported.red).toBeGreaterThan(5000);
 await page.locator('[data-category="accessory"]').click();await page.locator('[data-part="accessory-none"]').click();expect(await amount()).toBe(base);
});
