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

test('retired accessories clear from saved selections and collections without dropping other parts',async({page})=>{
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
 await page.addInitScript(({selection,snapshot,total})=>{
  localStorage.setItem('teuilor-selection-v1',JSON.stringify(selection));
  localStorage.setItem('teuilor-cart-v1',JSON.stringify([{selection,snapshot,total}]));
 },{selection,snapshot,total});
 const failures=[];page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 await page.goto('/');
 await expect(page.locator('#figure [data-layer="accessory"]')).toHaveCount(0);
 await page.locator('[data-category="accessory"]').click();
 await expect(page.locator('[data-part="accessory-none"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('#cart-open').click();
 await expect(page.locator('.cart-item')).toHaveCount(1);
 await expect(page.locator('.cart-art [data-layer="accessory"]')).toHaveCount(0);
 expect(Number((await page.locator('#cart-sum').innerText()).replace(/\D/g,''))).toBe(expected);
 for(const part of snapshot.filter(p=>p.category!=='accessory')){
  await expect(page.locator(`.cart-art [data-layer="${part.category}"]`)).toHaveAttribute('href',part.image);
 }
 await page.locator('#cart-dialog .close').click();
 const first=catalog.find(p=>p.category==='accessory');
 await page.locator(`[data-part="${first.id}"]`).click();
 expect(Number((await page.locator('#total').innerText()).replace(/\D/g,''))).toBe(expected+first.price);
 await page.locator('#add-cart').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
 expect(saved[0].selection.accessory).toBe('accessory-none');
 expect(saved[0].total).toBe(expected);
 expect(saved[0].snapshot.some(p=>p.id===removed.id)).toBe(false);
 expect(saved[1].selection.accessory).toBe(first.id);
 expect(failures).toEqual([]);
});
