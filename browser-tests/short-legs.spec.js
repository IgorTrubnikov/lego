import {test,expect} from '@playwright/test';
const choose=async(page,category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-part="${id}"]`).click();};

test('six short legs lower the figure without shrinking its upper body and render consistently in PNG',async({page})=>{
 await page.goto('/');
 const catalog=await page.evaluate(async()=>(await import('./catalog.js')).default);
 const shorts=catalog.filter(p=>p.category==='legs'&&p.heightOffset);
 expect(shorts).toHaveLength(6);
 await choose(page,'torso','torso-tank-50');
 for(const short of shorts){
  await choose(page,'legs',short.id);
  await expect(page.locator('#total')).toHaveText(/550/);
  for(const layer of ['legs','torso','face','hair'])await expect(page.locator(`#figure [data-layer="${layer}"]`)).toHaveAttribute('transform','translate(0 48)');
  await expect(page.locator('#figure')).toHaveAttribute('aria-label',/Короткие/);
 }
 const bounds=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default,{withOptionalChoices}=await import('./parts.js'),{createFigurePng}=await import('./export-image.js');
  const parts=withOptionalChoices(catalog),selection=JSON.parse(localStorage.getItem('teuilor-selection-v1'));
  const render=async selection=>{
   const blob=await createFigurePng(selection,parts),url=URL.createObjectURL(blob),image=new Image();image.src=url;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
   const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let top=canvas.height,bottom=0;
   for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>128){top=Math.min(top,y);bottom=Math.max(bottom,y);}
   return {top,bottom,width:canvas.width,height:canvas.height};
  };
  return {short:await render(selection),normal:await render({...selection,legs:'legs-catalog-04'})};
 });
 expect(bounds.short.top-bounds.normal.top).toBe(96);
 expect(Math.abs(bounds.short.bottom-bounds.normal.bottom)).toBeLessThanOrEqual(4);
 expect([bounds.short.width,bounds.short.height]).toEqual([1200,1440]);
 await page.reload();await expect(page.locator('#figure [data-layer="face"]')).toHaveAttribute('transform','translate(0 48)');
 await choose(page,'legs','legs-catalog-04');await expect(page.locator('#figure [data-layer="face"]')).not.toHaveAttribute('transform',/translate/);
});

test('sleeveless tops have bare arms and short height persists in the cart and order PNG',async({page})=>{
 await page.goto('/');
 const checks=await page.evaluate(async()=>{
  const catalog=(await import('./catalog.js')).default;
  return Promise.all(catalog.filter(p=>p.id.startsWith('torso-tank-')).map(async part=>{
   const image=new Image();image.src=part.image;await image.decode();
   const canvas=document.createElement('canvas');canvas.width=600;canvas.height=720;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
   const data=ctx.getImageData(0,0,600,720).data;
   const arms=[145,410].map(left=>{
    let opaque=0,skin=0;
    for(let y=365;y<480;y++)for(let x=left;x<left+45;x++){
     const i=(y*600+x)*4,[r,g,b,a]=data.slice(i,i+4);if(a>200){opaque++;if(r>170&&g>105&&b>55&&r>g&&g>b)skin++;}
    }
    return {opaque,skin};
   });
   return {id:part.id,arms};
  }));
 });
 expect(checks).toHaveLength(2);
 for(const check of checks)for(const arm of check.arms){expect(arm.opaque,check.id).toBeGreaterThan(500);expect(arm.skin/arm.opaque,check.id).toBeGreaterThan(.85);}
 await choose(page,'torso','torso-tank-51');await choose(page,'legs','legs-catalog-short-31');
 await page.locator('#add-cart').click();await expect(page.locator('.cart-item')).toHaveCount(1);
 await page.reload();
 const cart=await page.evaluate(()=>JSON.parse(localStorage.getItem('teuilor-cart-v1')));
 expect(cart.items[0].details.find(p=>p.category==='legs').name).toContain('Короткие');
 await page.locator('[data-cart-edit]').click();await expect(page.locator('#figure [data-layer="torso"]')).toHaveAttribute('transform','translate(0 48)');
 await page.locator('#add-cart').click();await expect(page.locator('#cancel-edit')).toBeHidden();
 await page.evaluate(()=>{
  window.__shortTexts=[];const fill=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__shortTexts.push(String(text));return fill.call(this,text,...args);};
 });
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 const text=await page.evaluate(()=>window.__shortTexts.join(' '));expect(text).toContain('Короткие белые');expect(text).toContain('Белая майка без рукавов');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
