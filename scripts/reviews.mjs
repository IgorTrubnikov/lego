import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {escapeHtml} from '../parts.js';
import {hero,cta} from './site-pages.mjs';
export async function readReviews(root){
 const reviews=JSON.parse(await readFile(path.join(root,'assets/reviews/reviews.json'),'utf8')),ids=new Set();
 if(!Array.isArray(reviews))throw Error('Отзывы должны быть массивом в assets/reviews/reviews.json');
 for(const review of reviews){
  if(!/^review-[0-9]+$/.test(review.id)||ids.has(review.id)||!review.title?.trim()||!review.alt?.trim())throw Error('Неверная запись отзыва: '+review.id);
  ids.add(review.id);
  for(const field of ['width','height','fullWidth','fullHeight'])if(!Number.isInteger(review[field])||review[field]<1||review[field]>10000)throw Error('Неверные размеры отзыва: '+review.id);
  for(const [field,folder] of [['thumb','thumbs'],['full','full']]){
   if(review[field]!==`assets/reviews/${folder}/${review.id}.webp`||!(await stat(path.join(root,review[field]))).isFile())throw Error('Неверный путь скриншота: '+review.id);
  }
 }
 return reviews;
}
export function reviewsPage(reviews){return {id:'reviews',title:'Отзывы покупателей — LEGO.FROM.TEUILOR',description:'Отзывы покупателей о персональных подарках LEGO.FROM.TEUILOR: скриншоты о рамке, сборке, доставке и впечатлениях от заказа.',scripts:reviews.length?['reviews.js']:[],body:
 hero('Отзывы','Ваши слова —<br><em>наша радость.</em>','Спасибо, что доверяете нам ваши истории.<br>Здесь — скриншоты отзывов покупателей о готовых подарках.')+
 `<section class="reviews-collection" aria-label="Отзывы покупателей"><div class="reviews-heading"><p>Нажмите на скриншот, чтобы рассмотреть его ближе.</p><span>${reviews.length} скриншотов</span></div><div class="reviews-grid">${reviews.map((r,i)=>`<figure class="review-card"><a class="review-open" href="${r.full}" target="_blank" rel="noopener noreferrer" aria-label="Увеличить: ${escapeHtml(r.title)}"><img src="${r.thumb}" width="${r.width}" height="${r.height}" loading="${i<3?'eager':'lazy'}" decoding="async" alt="${escapeHtml(r.alt)}"><span class="review-zoom" aria-hidden="true">Рассмотреть ближе ↗</span></a><figcaption>${escapeHtml(r.title)}</figcaption></figure>`).join('')}</div></section>`+
 cta('Ваша история — следующая','Соберите персонажа или напишите нам — поможем придумать подарок для близкого человека.')+
 (reviews.length?`<dialog class="review-viewer" id="review-viewer" aria-labelledby="review-title"><div class="review-toolbar"><span id="review-position" aria-live="polite"></span><a id="review-original" target="_blank" rel="noopener noreferrer">Открыть отдельно ↗</a><button type="button" id="review-close" aria-label="Закрыть отзыв">×</button></div><div class="review-navigation"><button type="button" id="review-prev" aria-label="Предыдущий скриншот">← Назад</button><h2 id="review-title"></h2><button type="button" id="review-next" aria-label="Следующий скриншот">Далее →</button></div><div class="review-scroll" tabindex="0" aria-label="Скриншот отзыва, прокрутка"><img id="review-full" alt=""></div></dialog>`:'')};}
