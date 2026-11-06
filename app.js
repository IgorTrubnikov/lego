import {categories,initialSelection,money,totalPrice,escapeHtml,renderFigure,withOptionalChoices} from './parts.js';
import catalog from './catalog.js';
const parts=withOptionalChoices(catalog);
const $=s=>document.querySelector(s);
// A category may contain only new images, without any of the demo IDs.
const startingSelection=Object.fromEntries(categories.map(c=>[c.id,parts.find(p=>p.category===c.id&&p.id===initialSelection[c.id])?.id||parts.find(p=>p.category===c.id).id]));
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
let selection={...startingSelection,...read('teuilor-selection-v1',{})};
for(const c of categories) if(!parts.some(p=>p.id===selection[c.id]&&p.category===c.id)) selection[c.id]=startingSelection[c.id];
let current='hair',renderedCategory,timer;
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function persist(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{toast('Не удалось сохранить: хранилище браузера заполнено или недоступно.');return false;}}
function render(){
 $('#figure').innerHTML=renderFigure(selection,parts);
 const addon=parts.find(p=>p.id===selection.altar&&p.category==='altar'&&p.image);
 const addonPanel=$('#order-addon'),addonArt=$('#addon-art'),addonName=$('#addon-name');
 if(addonPanel)addonPanel.hidden=!addon;
 if(addonArt)addonArt.innerHTML=addon?renderFigure(selection,parts,'altar'):'';
 if(addonName)addonName.textContent=addon?addon.name+' · '+money(addon.price):'';
 $('#png-ready')?.setAttribute('hidden','');
 $('#figure').setAttribute('aria-label','Фигурка: '+categories.filter(c=>c.id!=='altar').map(c=>parts.find(p=>p.id===selection[c.id])?.name).filter(Boolean).join(', '));
 $('#total').textContent=money(totalPrice(selection,parts));
 $('#breakdown').innerHTML=categories.map(c=>`<div>${c.singular}<strong>${money(parts.find(p=>p.id===selection[c.id])?.price||0)}</strong></div>`).join('');
 renderCatalog();persist('teuilor-selection-v1',selection);
}
function renderTabs(){
 if(!$('#tabs').children.length){
  $('#tabs').innerHTML=categories.map(c=>`<button class="tab" role="tab" id="tab-${c.id}" aria-controls="catalog" data-category="${c.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg>${c.name}</button>`).join('');
 }
 for(const tab of $('#tabs').children){
  const active=tab.dataset.category===current;
  tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
 }
}
function renderCatalog(){
 renderTabs();
 const list=parts.filter(p=>p.category===current);
 const count=list.filter(p=>p.image).length;
 $('#category-title').textContent=categories.find(c=>c.id===current).name;
 $('#variants-count').textContent=`${count} ${count%10===1&&count%100!==11?'вариант':count%10>=2&&count%10<=4&&(count%100<12||count%100>14)?'варианта':'вариантов'}`;
 $('#catalog').setAttribute('aria-labelledby','tab-'+current);
 const scrollTop=renderedCategory===current?$('#catalog').scrollTop:0;
 $('#catalog').innerHTML=list.map(p=>`<button title="${escapeHtml(p.name)}" class="part-card ${selection[current]===p.id?'selected':''}" data-part="${escapeHtml(p.id)}" aria-pressed="${selection[current]===p.id}" aria-label="${escapeHtml(p.name)}, ${money(p.price)}">${p.id.includes('-3d-')?'<span class="part-badge">НОВОЕ</span>':''}<span class="part-art">${p.image?renderFigure({...selection,[current]:p.id},parts,current):'<span class="empty-choice" aria-hidden="true">∅</span>'}</span><span class="part-name">${escapeHtml(p.name)}</span><span class="part-price">${money(p.price)}</span></button>`).join('');
 $('#catalog').scrollTop=scrollTop;renderedCategory=current;
}
$('#tabs').addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(btn){current=btn.dataset.category;renderCatalog();$('#tab-'+current).focus({preventScroll:true});}});
$('#tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const focused=e.target.closest('[data-category]');const index=categories.findIndex(c=>c.id===(focused?.dataset.category||current));current=categories[e.key==='Home'?0:e.key==='End'?categories.length-1:(index+(e.key==='ArrowRight'?1:categories.length-1))%categories.length].id;renderCatalog();$('#tab-'+current).focus({preventScroll:true});});
$('#catalog').addEventListener('click',e=>{const btn=e.target.closest('[data-part]');if(btn){selection[current]=btn.dataset.part;render();document.querySelector(`[data-part="${selection[current]}"]`)?.focus({preventScroll:true});}});
$('#reset').onclick=()=>{selection={...startingSelection};render();toast('Вернулись к первой истории');};
$('#random').onclick=()=>{for(const c of categories){const list=parts.filter(p=>p.category===c.id);selection[c.id]=list[Math.floor(Math.random()*list.length)].id;}render();};
$('#remove-addon')?.addEventListener('click',()=>{selection.altar='altar-none';render();});
$('#catalog-help-open')?.addEventListener('click',()=>$('#catalog-help-dialog')?.showModal());
let pngUrl;
$('#save-png')?.addEventListener('click',async()=>{
 const button=$('#save-png'),snapshot={...selection};
 button.disabled=true;button.textContent='Готовлю PNG…';
 try{
  const {createFigurePng}=await import('./export-image.js');
  const blob=await createFigurePng(snapshot,parts);
  if(pngUrl)URL.revokeObjectURL(pngUrl);
  pngUrl=URL.createObjectURL(blob);
  const link=$('#png-link');link.href=pngUrl;
  $('#png-ready').hidden=false;
  const download=document.createElement('a');download.href=pngUrl;download.download='teuilor-personazh.png';
  document.body.append(download);download.click();download.remove();
 }catch{
  toast('Не удалось сохранить изображение. Попробуйте ещё раз.');
 }finally{button.disabled=false;button.textContent='Скачать персонажа в PNG';}
});
for(const d of document.querySelectorAll('dialog')){d.querySelector('.close')?.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});}
render();
