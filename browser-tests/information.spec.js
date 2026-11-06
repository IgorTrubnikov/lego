import {test,expect} from '@playwright/test';
import {socialLinks} from '../scripts/site-pages.mjs';

test('information pages have working navigation and the supplied contacts',async({page})=>{
 await page.goto('/');
 if(page.viewportSize().width<=1000){
  await page.locator('.mobile-menu summary').click();
  await page.getByRole('navigation',{name:'Мобильная навигация'}).getByRole('link',{name:'Контакты',exact:true}).click();
 }else{
  await page.getByRole('navigation',{name:'Основная навигация'}).getByRole('link',{name:'Контакты',exact:true}).click();
 }
 await expect(page).toHaveURL(/contacts\.html$/);
 await expect(page.getByRole('heading',{level:1})).toContainText('Остаёмся');
 const cards=page.locator('.contact-card');await expect(cards).toHaveCount(3);
 for(const [i,id] of ['telegram','instagram','tiktok'].entries()){
  await expect(cards.nth(i)).toHaveAttribute('href',socialLinks[id]);
  await expect(cards.nth(i)).toHaveAttribute('rel','noopener noreferrer');
 }
 for(const filename of ['delivery.html','faq.html']){
  await page.locator(`.site-footer a[href="${filename}"]`).click();
  await expect(page).toHaveURL(new RegExp(filename.replace('.','\\.')+'$'));
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(page.viewportSize().width<=1000){
  await page.locator('.mobile-menu summary').click();await page.keyboard.press('Escape');
  await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open','');
  await expect(page.locator('.mobile-menu summary')).toBeFocused();
 }
});

test('delivery and FAQ explain marketplace payment, delivery and order steps',async({page})=>{
 await page.goto('/delivery.html');
 for(const text of ['Авито','Озон-сделка','СДЭК','Яндекс Доставка','Озон Доставка','Постаматы'])await expect(page.locator('main')).toContainText(text);
 await expect(page.locator('main')).toContainText('1–3 дня');
 await page.goto('/faq.html');
 const urgency=page.locator('.faq-item').nth(1);
 await expect(urgency).not.toHaveAttribute('open','');
 await urgency.locator('summary').click();
 await expect(urgency.locator('.faq-answer')).toBeVisible();
 await expect(urgency).toContainText('день в день с доплатой');
 await expect(urgency).toContainText('1–3 дня');
 await expect(page.locator('#order .order-steps li')).toHaveCount(5);
 await expect(page.locator('#order')).toContainText('пришлём фото');
 await expect(page.locator('.faq-answer').first()).toContainText('базового набора');
 await page.locator('#order .text-link').click();await expect(page).toHaveURL(/delivery\.html$/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('home presents workshop facts and leads to a real Telegram enquiry',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');
 if(page.viewportSize().width<=1000){
  await page.locator('.mobile-menu summary').click();
  await page.getByRole('navigation',{name:'Мобильная навигация'}).getByRole('link',{name:'Конструктор',exact:true}).click();
  await expect(page.locator('.mobile-menu')).not.toHaveAttribute('open','');
 }
 const stats=page.locator('.studio-stats');
 for(const value of ['1–3','Ручная','250+','300'])await expect(stats).toContainText(value);
 await expect(page.locator('.frame-story')).toContainText('Твой образ и твоя история');
 await expect(page.locator('.frame-story .primary')).toHaveAttribute('href',socialLinks.telegram);
 await expect(page.locator('.quote-note')).toContainText('предварительный расчёт');
 await expect(page.locator('#order-telegram')).toHaveAttribute('href',socialLinks.telegram);
 await expect(page.locator('#cart-dialog, #cart-open, #add-cart')).toHaveCount(0);
 await expect(page.locator('#save-png')).toBeVisible();
 expect(errors).toEqual([]);
});
