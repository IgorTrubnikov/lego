import {test,expect} from '@playwright/test';

test('a new page bypasses cached scripts and loads one release including PNG export',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));const scripts=[];
 page.on('request',r=>{if(/\.(?:js|css)(?:\?|$)/.test(r.url()))scripts.push(r.url());});
 await page.route('**/app.js',route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("Cached script was used");'}));
 await page.goto('/');
 const manifest=await page.evaluate(async()=>(await fetch('asset-manifest.json')).json());
 await expect(page.locator('#tabs [role="tab"]')).toHaveCount(7);
 await expect(page.locator('#figure image')).toHaveCount(4);
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-23"]').click();
 const pending=page.waitForEvent('download');await page.locator('#save-png').click();expect(await (await pending).failure()).toBeNull();
 for(const name of ['app.js','parts.js','catalog.js','export-image.js','navigation.js','style.css'])expect(scripts.some(url=>url.endsWith('/'+manifest.assets[name])),name).toBe(true);
 expect(errors).toEqual([]);
});

test('missing optional controls in a cached page cannot stop the constructor',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://127.0.0.1:3100/',async route=>{
  const response=await route.fetch();let html=await response.text();
  html=html.replace(/<section id="order-addon"[\s\S]*?<\/section>/,'').replace(/<div id="png-ready"[\s\S]*?<\/div>/,'').replace(/<div class="checkout-actions">[\s\S]*?<\/div>/,'').replace(/<button id="catalog-help-open">[\s\S]*?<\/button>/,'');
  html=html.replace(/src="app\.js\?v=[^"]+"/,'src="app.js"');
  await route.fulfill({response,body:html});
 });
 await page.goto('/');
 await expect(page.locator('#figure image')).toHaveCount(4);
 await expect(page.locator('#tabs [role="tab"]')).toHaveCount(7);
 await page.locator('[data-category="legs"]').click();await page.locator('[data-part="legs-catalog-23"]').click();
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-23__/);
 await page.locator('[data-category="altar"]').click();await page.locator('[data-part="altar-altar-1"]').click();
 await page.locator('#reset').click();
 await expect(page.locator('#figure [data-layer="legs"]')).toHaveAttribute('href',/catalog-04__/);
 expect(errors).toEqual([]);
});
