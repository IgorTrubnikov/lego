import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const reviews=JSON.parse(await readFile(new URL('../assets/reviews/reviews.json',import.meta.url),'utf8'));
test('reviews navigation exposes all 13 uncut screenshots and keeps the page within the viewport',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 const mobile=page.viewportSize().width<=1000;if(mobile)await page.locator('.mobile-menu summary').click();
 await page.getByRole('navigation',{name:mobile?'Мобильная навигация':'Основная навигация'}).getByRole('link',{name:'Отзывы',exact:true}).click();
 await expect(page).toHaveURL(/reviews\.html$/);await expect(page.getByRole('heading',{level:1})).toContainText('Ваши слова');
 await expect(page.locator('.review-card')).toHaveCount(13);await expect(page.locator('.reviews-heading')).toContainText('13 скриншотов');
 await expect(page.locator('.site-footer a[href="reviews.html"]')).toHaveAttribute('aria-current','page');
 const checks=await page.evaluate(async reviews=>Promise.all(reviews.map(async r=>{const sizes=[];for(const src of [r.thumb,r.full]){const img=new Image();img.src=src;await img.decode();sizes.push([img.width,img.height]);}return sizes;})),reviews);
 for(const [i,sizes] of checks.entries())expect(sizes,reviews[i].id).toEqual([[reviews[i].width,reviews[i].height],[reviews[i].fullWidth,reviews[i].fullHeight]]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('review viewer scrolls long screenshots, navigates every image and returns keyboard focus',async({page})=>{
 await page.goto('/reviews.html');const first=page.locator('.review-open').first();await first.click();
 const viewer=page.locator('#review-viewer');await expect(viewer).toBeVisible();await expect(page.locator('#review-close')).toBeFocused();
 for(const [i,r] of reviews.entries()){
  await expect(page.locator('#review-position')).toHaveText(`${i+1} / 13`);await expect(page.locator('#review-full')).toHaveAttribute('src',new RegExp(r.full+'$'));
  await expect(page.locator('#review-original')).toHaveAttribute('href',new RegExp(r.full+'$'));await page.locator('#review-full').evaluate(img=>img.decode());
  expect(await page.locator('#review-full').evaluate(img=>Math.abs(img.width/img.height-img.naturalWidth/img.naturalHeight))).toBeLessThan(.01);
  await page.locator('#review-next').click();
 }
 await expect(page.locator('#review-position')).toHaveText('1 / 13');await page.keyboard.press('ArrowLeft');await expect(page.locator('#review-position')).toHaveText('13 / 13');await page.keyboard.press('ArrowRight');await expect(page.locator('#review-position')).toHaveText('1 / 13');
 await page.keyboard.press('Escape');await page.setViewportSize({...page.viewportSize(),height:500});const longest=page.locator('.review-open').nth(reviews.findIndex(r=>r.fullHeight===Math.max(...reviews.map(x=>x.fullHeight))));await longest.click();
 await page.locator('#review-full').evaluate(img=>img.decode());const scroller=page.locator('.review-scroll');
 await scroller.evaluate(el=>el.scrollTop=el.scrollHeight);expect(await scroller.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.locator('#review-next').click();expect(await scroller.evaluate(el=>el.scrollTop)).toBe(0);
 await page.keyboard.press('Escape');await expect(viewer).not.toBeVisible();await expect(longest).toBeFocused();
 await first.click();await page.locator('#review-close').click();await expect(viewer).not.toBeVisible();expect(await page.locator('html').getAttribute('class')).not.toContain('lightbox-open');
});
test('review screenshots remain available as ordinary links without JavaScript',async({browser})=>{
 const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();await page.goto('http://127.0.0.1:3100/reviews.html');
 await expect(page.locator('.review-card')).toHaveCount(13);await expect(page.locator('.review-open').first()).toHaveAttribute('href',reviews[0].full);await expect(page.locator('.review-open').first()).toHaveAttribute('target','_blank');await context.close();
});
