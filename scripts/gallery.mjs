import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {escapeHtml} from '../parts.js';
import {hero,cta} from './site-pages.mjs';
export const workCategories={frames:'Рамки',keychains:'Брелоки',domes:'Под колпаком'};
export async function readGallery(root){
 const works=JSON.parse(await readFile(path.join(root,'assets/gallery/works.json'),'utf8'));
 if(!Array.isArray(works))throw new Error('Галерея должна быть массивом в assets/gallery/works.json');
 const ids=new Set();
 for(const work of works){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(work.id)||ids.has(work.id)||!workCategories[work.category]||!work.title?.trim()||!work.alt?.trim())throw new Error('Неверная или повторяющаяся запись галереи: '+work.id);
  ids.add(work.id);
  for(const field of ['width','height','fullWidth','fullHeight'])if(!Number.isInteger(work[field])||work[field]<1||work[field]>10000)throw new Error('Неверные размеры фото: '+work.id);
  for(const [field,dir] of [['thumb','thumbs'],['full','full']]){
   if(work[field]!==`assets/gallery/${dir}/${work.id}.webp`)throw new Error('Неверный путь галереи: '+work.id);
   if(!(await stat(path.join(root,work[field]))).isFile())throw new Error('Не найдено фото: '+work[field]);
  }
 }
 return works;
}
const zoomIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/></svg>';
export function workCard(work,index,{preview=false}={}){
 const href=preview?'works.html#work-'+work.id:work.full;
 return `<figure class="work-card" id="${preview?'preview-':'work-'}${work.id}" data-category="${work.category}"><a class="work-open" data-work="${work.id}" href="${href}"${preview?'':' target="_blank" rel="noopener noreferrer"'} aria-label="${preview?'Посмотреть работу: ':'Увеличить фото: '}${escapeHtml(work.title)}"><img src="${work.thumb}" srcset="${work.thumb} ${work.width}w, ${work.full} ${work.fullWidth}w" sizes="(max-width: 650px) calc(100vw - 40px), (max-width: 1000px) calc((100vw - 100px) / 2), 400px" width="${work.width}" height="${work.height}" loading="${preview||index>2?'lazy':'eager'}" decoding="async" alt="${escapeHtml(work.alt)}"><span class="work-zoom">${zoomIcon}<span>${preview?'В галерее':'Рассмотреть ближе'}</span></span></a><figcaption><span class="work-category">${workCategories[work.category]}</span><h2>${escapeHtml(work.title)}</h2></figcaption></figure>`;
}
export function renderWorksPreview(works){
 if(!works.length)return '';
 const preferred=['heart','dome-pair','red-heart-keys'];
 const selected=[...preferred.map(id=>works.find(w=>w.id===id)).filter(Boolean),...works.filter(w=>!preferred.includes(w.id))].slice(0,3);
 return `<section class="works-preview"><div class="works-preview-heading"><div><div class="eyebrow">СДЕЛАНО С ЛЮБОВЬЮ</div><h2>Истории, которые <em>уже обрели форму.</em></h2></div><a class="text-link" href="works.html">Все готовые работы <span aria-hidden="true">→</span></a></div><div class="works-grid">${selected.map((work,index)=>workCard(work,index,{preview:true})).join('')}</div></section>`;
}
export function galleryPage(works){
 const filters=[['all','Все работы'],...Object.entries(workCategories)];
 return {id:'works',title:'Готовые работы — LEGO.FROM.TEUILOR',description:'Настоящие фотографии готовых рамок, парных брелоков и композиций под колпаком от LEGO.FROM.TEUILOR. Найдите идею для своей истории.',scripts:works.length?['gallery.js']:[],body:
  hero('Готовые работы','Ваши истории.<br><em>Уже в деталях.</em>','Рамки, брелоки и маленькие миры под колпаком.<br>Настоящие работы нашей мастерской — для вдохновения и ваших новых идей.')+
  (works.length?`<section class="works-collection" aria-label="Галерея готовых работ"><div class="works-toolbar"><div class="work-filters" role="group" aria-label="Категории работ" hidden>${filters.map(([id,label])=>`<button type="button" data-filter="${id}" aria-pressed="${id==='all'}">${label} <span>${id==='all'?works.length:works.filter(w=>w.category===id).length}</span></button>`).join('')}</div><span id="work-count" role="status" aria-live="polite">${works.length} фото</span></div><div class="works-grid" id="works-grid">${works.map((work,index)=>workCard(work,index)).join('')}</div></section>`:'<section class="gallery-empty"><span aria-hidden="true">♡</span><h2>Мы обновляем галерею</h2><p>Новые фотографии готовых работ скоро появятся здесь.</p></section>')+
  cta('А какая история будет вашей?','Выберите настроение, расскажите о близких — и мы создадим подарок с вашими деталями.')+
  (works.length?`<dialog class="work-lightbox" id="work-lightbox" aria-labelledby="work-lightbox-title"><div class="lightbox-toolbar"><span id="work-position" aria-live="polite"></span><a id="work-download" target="_blank" rel="noopener noreferrer">Открыть отдельно</a><button type="button" id="work-close" aria-label="Закрыть просмотр">×</button></div><div class="lightbox-stage"><button type="button" id="work-prev" aria-label="Предыдущее фото">‹</button><img id="work-full" alt=""><button type="button" id="work-next" aria-label="Следующее фото">›</button></div><div class="lightbox-caption"><span id="work-lightbox-category"></span><h2 id="work-lightbox-title"></h2></div></dialog>`:'')};
}
