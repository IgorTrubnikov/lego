import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const works=JSON.parse(await readFile(new URL('../assets/gallery/works.json',import.meta.url),'utf8'));

test('gallery navigation, categories and every supplied photo work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 if(page.viewportSize().width<=1000){await page.locator('.mobile-menu summary').click();await page.getByRole('navigation',{name:'Мобильная навигация'}).getByRole('link',{name:'Готовые работы',exact:true}).click();}
 else await page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Готовые работы',exact:true}).click();
 await expect(page).toHaveURL(/works\.html$/);
 await expect(page.locator('#works-grid .work-card')).toHaveCount(works.length);
 await expect(page.locator('#work-count')).toHaveText(works.length+' фото');
 for(const category of ['frames','keychains','domes']){
  await page.locator(`[data-filter="${category}"]`).click();
  await expect(page.locator('#works-grid .work-card:visible')).toHaveCount(works.filter(w=>w.category===category).length);
 }
 await page.locator('[data-filter="all"]').click();
 const results=await page.evaluate(async works=>Promise.all(works.map(async work=>{
  const sizes=[];
  for(const field of ['thumb','full']){const image=new Image();image.src=work[field];await image.decode();sizes.push([image.width,image.height]);}
  return {id:work.id,sizes};
 })),works);
 for(const [i,result] of results.entries())expect(result.sizes,result.id).toEqual([[works[i].width,works[i].height],[works[i].fullWidth,works[i].fullHeight]]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(errors).toEqual([]);
});

test('full-size view supports next, previous, filtering, Escape and focus restoration',async({page})=>{
 await page.goto('/works.html');
 const category=works[0].category,subset=works.filter(w=>w.category===category);
 await page.locator(`[data-filter="${category}"]`).click();
 const opener=page.locator(`#work-${subset[0].id} .work-open`);await opener.click();
 const dialog=page.locator('#work-lightbox');await expect(dialog).toBeVisible();
 await expect(page.locator('#work-position')).toHaveText('1 / '+subset.length);
 await expect(page.locator('#work-full')).toHaveAttribute('src',new RegExp(subset[0].id+'\\.webp$'));
 await expect(page.locator('#work-close')).toBeFocused();
 await page.locator('#work-next').click();await expect(page.locator('#work-position')).toHaveText((subset.length>1?'2':'1')+' / '+subset.length);
 await page.keyboard.press('ArrowLeft');await expect(page.locator('#work-position')).toHaveText('1 / '+subset.length);
 await page.locator('#work-prev').click();await expect(page.locator('#work-position')).toHaveText(subset.length+' / '+subset.length);
 await expect(page.locator('#work-download')).toHaveAttribute('href',new RegExp(subset.at(-1).id+'\\.webp$'));
 await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(opener).toBeFocused();
 await opener.click();await page.locator('#work-close').click();await expect(dialog).not.toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.classList.contains('lightbox-open'))).toBe(false);
});

test('gallery remains a usable photo page without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:3100/works.html');
 await expect(page.locator('#works-grid .work-card')).toHaveCount(works.length);
 await expect(page.locator('.work-filters')).not.toBeVisible();
 await expect(page.locator('#works-grid .work-open').first()).toHaveAttribute('href',works[0].full);
 await page.locator('.mobile-menu summary').click();await expect(page.getByRole('navigation',{name:'Мобильная навигация'})).toBeVisible();
 await context.close();
});
