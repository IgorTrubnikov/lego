import {cartStorageKey,newCart,restoreCart,packagingOptions,newGroup,assignGroup,cartTotals,snapshotDetails,detailIsExtra,refreshCart} from './cart.js';
import {categories,initialSelection,figurePrice,money,totalPrice,priceBreakdown,includedInFigure,escapeHtml,renderFigure,withOptionalChoices,largeAnimalIds,selectedSuit,selectedSkirt,selectionCategories,choosePart} from './parts.js';
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
 $('#figure').classList.toggle('has-transport',!!parts.find(p=>p.id===selection.transport&&p.category==='transport'&&p.image));
 $('#figure').classList.toggle('has-large-animal',largeAnimalIds.has(selection.animal));
 $('#figure').classList.toggle('has-children',!!parts.find(p=>p.id===selection.children&&p.category==='children'&&p.image));
 const addon=parts.find(p=>p.id===selection.altar&&p.category==='altar'&&p.image);
 const addonPanel=$('#order-addon'),addonArt=$('#addon-art'),addonName=$('#addon-name');
 if(addonPanel)addonPanel.hidden=!addon;
 if(addonArt)addonArt.innerHTML=addon?renderFigure(selection,parts,'altar'):'';
 if(addonName)addonName.textContent=addon?addon.name+' · '+money(addon.price):'';
 $('#figure').setAttribute('aria-label','Фигурка: '+selectionCategories(selection,parts).filter(c=>c.id!=='altar').map(c=>parts.find(p=>p.id===selection[c.id])?.name).filter(Boolean).join(', '));
 $('#total').textContent=money(totalPrice(selection,parts,draftBasePrice()));
 $('#breakdown').innerHTML=priceBreakdown(selection,parts,draftBasePrice()).map(row=>`<div>${escapeHtml(row.label)}<strong>${money(row.price)}</strong></div>`).join('');
 if($('#draft-caption'))$('#draft-caption').textContent=editingId?'ИЗМЕНЕНИЕ ПЕРСОНАЖА '+(cart.items.findIndex(i=>i.id===editingId)+1):'ПЕРСОНАЖ '+(cart.items.length+1);
 if($('#cancel-edit'))$('#cancel-edit').hidden=!editingId;
 if($('#add-cart')&&!adding)$('#add-cart').textContent=editingId?'Сохранить изменения':'Добавить персонажа в корзину';
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
 const suit=selectedSuit(selection,parts),skirt=selectedSkirt(selection,parts),bodyHidden=(!!suit&&['torso','legs','skirt'].includes(current))||(current==='legs'&&skirt?.skirtMode==='replace-legs');
 const note=$('#outfit-note');if(note){
  note.hidden=!suit&&!skirt&&!['suit','skirt'].includes(current);
  note.textContent=suit?`Выбран комплект: тело и ноги входят в стоимость.${suit.includedLabel?' '+suit.includedLabel+'.':''} Выбор отдельной одежды, брюк или юбки заменит костюм.`:current==='skirt'||skirt?(skirt?.skirtMode==='replace-legs'?'Длинная юбка заменяет брюки в изображении и цене. Выбор брюк снимет длинную юбку.':'Короткие юбки надеваются поверх выбранных брюк. Длинная белая юбка заменяет брюки. Выбор юбки заменит готовый костюм одеждой по частям.'):'Костюм включает тело и ноги. «Одежда по частям» возвращает выбранные отдельно детали.';
 }
 $('#catalog').innerHTML=list.map(p=>{const active=!bodyHidden&&selection[current]===p.id;const priceText=includedInFigure.has(p.category)?'Входит в фигурку':money(p.category==='suit'&&p.image?draftBasePrice():p.price);return `<button title="${escapeHtml(p.name)}" class="part-card ${active?'selected':''}" data-part="${escapeHtml(p.id)}" aria-pressed="${active}" aria-label="${escapeHtml(p.name)}, ${escapeHtml(priceText)}${p.includedLabel?', '+escapeHtml(p.includedLabel):''}">${p.id.includes('-3d-')?'<span class="part-badge">НОВОЕ</span>':''}<span class="part-art">${p.image?renderFigure({...selection,[current]:p.id},parts,current):'<span class="empty-choice" aria-hidden="true">∅</span>'}</span><span class="part-name">${escapeHtml(p.name)}</span>${p.skirtMode?`<span class="part-includes">${p.skirtMode==='overlay'?'Поверх брюк':'Вместо брюк'}</span>`:''}${p.includedLabel?`<span class="part-includes">${escapeHtml(p.includedLabel)}</span>`:''}<span class="part-price">${escapeHtml(priceText)}</span></button>`;}).join('');
 $('#catalog').scrollTop=scrollTop;renderedCategory=current;
}
$('#tabs').addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(btn){current=btn.dataset.category;renderCatalog();$('#tab-'+current).focus({preventScroll:true});}});
$('#tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const focused=e.target.closest('[data-category]');const index=categories.findIndex(c=>c.id===(focused?.dataset.category||current));current=categories[e.key==='Home'?0:e.key==='End'?categories.length-1:(index+(e.key==='ArrowRight'?1:categories.length-1))%categories.length].id;renderCatalog();$('#tab-'+current).focus({preventScroll:true});});
$('#catalog').addEventListener('click',e=>{const btn=e.target.closest('[data-part]');if(btn){selection=choosePart(selection,current,btn.dataset.part,parts);render();document.querySelector(`[data-part="${selection[current]}"]`)?.focus({preventScroll:true});}});
$('#reset').onclick=()=>{selection={...startingSelection};render();toast('Вернулись к первой истории');};
$('#random').onclick=()=>{for(const c of categories){const list=parts.filter(p=>p.category===c.id);selection[c.id]=list[Math.floor(Math.random()*list.length)].id;}if(Math.random()<.5)selection.suit='suit-none';if(selectedSuit(selection,parts))selection.skirt='skirt-none';render();};
$('#remove-addon')?.addEventListener('click',()=>{selection.altar='altar-none';render();});
$('#catalog-help-open')?.addEventListener('click',()=>$('#catalog-help-dialog')?.showModal());
let cart=refreshCart(restoreCart(read(cartStorageKey,null)),parts),editingId=null,previousDraft=null,cartSaved=true,cartRevision=0,orderUrls=[],adding=false,exporting=false;
const hasUnavailable=()=>cart.items.some(i=>i.unavailable);
const draftBasePrice=()=>figurePrice;
function invalidateOrderFiles(){for(const url of orderUrls)URL.revokeObjectURL(url);orderUrls=[];$('#png-ready')?.setAttribute('hidden','');if($('#order-downloads'))$('#order-downloads').innerHTML='';}
function changedCart(){cartRevision++;invalidateOrderFiles();cartSaved=persist(cartStorageKey,cart);}
function renderCart(){
 if(!$('#cart-items'))return;
 const totals=cartTotals(cart);
 if($('#cart-count'))$('#cart-count').textContent=cart.items.length;
 $('#cart-status').textContent=cart.items.length?(cartSaved?'Сохранено в этом браузере':'Скачайте заказ перед закрытием страницы'):'';
 const renderItem=line=>`<article class="cart-item" data-cart-item="${escapeHtml(line.item.id)}"><div class="cart-item-art"><img class="cart-thumb" src="${escapeHtml(line.item.preview)}" alt="Персонаж ${line.index+1}" loading="lazy">${line.item.altarPreview?`<img class="cart-altar" src="${escapeHtml(line.item.altarPreview)}" alt="Свадебная композиция для персонажа ${line.index+1}" loading="lazy">`:''}</div><div class="cart-item-content"><h3>Персонаж ${line.index+1}</h3>${line.item.unavailable?'<p class="cart-unavailable">Некоторые детали удалены из каталога. Нажмите «Изменить» и сохраните персонажа заново.</p>':''}<p class="cart-item-prices">${line.included?'Фигурка входит в стоимость оформления':`Фигурка <span class="price-amount">${money(line.base)}</span>`} · дополнения <span class="price-amount">${money(line.extras)}</span></p><label class="cart-destination">Куда добавить<select data-cart-group="${escapeHtml(line.item.id)}" aria-label="Оформление персонажа ${line.index+1}">${totals.groups.map(g=>`<option value="${escapeHtml(g.id)}"${g.id===line.groupId?' selected':''}${g.capacity&&g.id!==line.groupId&&g.lines.length>=g.capacity?' disabled':''}>${escapeHtml(g.name)}${g.capacity&&g.id!==line.groupId&&g.lines.length>=g.capacity?' — занят':''}</option>`).join('')}</select></label><details><summary>Все выбранные детали (${line.item.details.length})</summary><ul>${line.item.details.map(p=>`<li><strong>${escapeHtml(p.label)}:</strong> ${escapeHtml(p.name)}<small>${escapeHtml(p.id)} · ${detailIsExtra(p)?money(p.price):'Входит в фигурку'}${p.includedLabel?' · '+escapeHtml(p.includedLabel):''}</small></li>`).join('')}</ul></details></div><div class="cart-item-actions"><strong>${line.included&&!line.extras?'Включён':money(line.total)}</strong><button type="button" data-cart-edit="${escapeHtml(line.item.id)}">Изменить</button><button type="button" data-cart-remove="${escapeHtml(line.item.id)}" aria-label="Удалить персонажа ${line.index+1}">Удалить</button></div></article>`;
 const groupRule=g=>g.type==='none'?'Каждая фигурка — 550 ₽.':g.type==='keychain'?'650 ₽ с одним персонажем. Дополнения отдельно.':g.type==='flask'?'1500 ₽ с первой фигуркой. Вторая и третья — по 400 ₽, с четвёртой — по 350 ₽.':`${money(g.price)} за рамку. Первые три фигурки — по 400 ₽, с четвёртой — по 350 ₽.`;
 $('#cart-items').innerHTML=!totals.lines.length&&!cart.groups.length?'<div class="cart-empty">Ваша история начинается с первого персонажа.<br>Соберите его в конструкторе и нажмите «Добавить персонажа в корзину».</div>':totals.groups.filter(g=>g.id!=='none'||g.lines.length).map(g=>`<section class="cart-group" data-group="${escapeHtml(g.id)}" aria-label="${escapeHtml(g.name)}"><div class="cart-group-heading"><div><h3>${escapeHtml(g.name)}</h3><p>${escapeHtml(groupRule(g))}</p></div><strong>${money(g.total)}</strong>${g.id!=='none'?`<button type="button" data-group-remove="${escapeHtml(g.id)}" aria-label="Удалить ${escapeHtml(g.name)}">Убрать оформление</button>`:''}</div>${g.lines.length?g.lines.map(renderItem).join(''):'<p class="group-empty">Выберите эту группу в поле «Куда добавить» у персонажа или удалите оформление.</p>'}${g.lines.length?`<p class="group-calculation">${g.type==='none'?'':`Оформление ${money(g.price)} + `}фигурки ${money(g.figures)} + дополнения ${money(g.extras)} = <strong>${money(g.total)}</strong></p>`:''}</section>`).join('');
 const select=$('#cart-packaging');
 if(select){select.innerHTML='<option value="">Добавить рамку, колбу или брелок</option>'+packagingOptions.filter(p=>p.id!=='none').map(p=>`<option value="${p.id}">${escapeHtml(p.name)} — ${money(p.price)}${p.includesFirst?' с персонажем':' без фигурок'}</option>`).join('');select.disabled=false;}
 if($('#packaging-items'))$('#packaging-items').innerHTML=packagingOptions.filter(p=>p.id!=='none'&&cart.groups.some(g=>g.type===p.id)).map(p=>{const quantity=cart.groups.filter(g=>g.type===p.id).length;return `<div class="packaging-line"><strong>${escapeHtml(p.name)}</strong><div class="packaging-stepper"><button type="button" data-format-step="${p.id}" data-step="-1" aria-label="Уменьшить количество: ${escapeHtml(p.name)}">−</button><input type="number" min="0" max="999" step="1" inputmode="numeric" data-format-quantity="${p.id}" aria-label="Количество: ${escapeHtml(p.name)}" value="${quantity}"><button type="button" data-format-step="${p.id}" data-step="1" aria-label="Увеличить количество: ${escapeHtml(p.name)}"${quantity===999?' disabled':''}>+</button></div></div>`;}).join('');
 $('#cart-summary').innerHTML=`<div>Фигурки сверх включённых<strong>${money(totals.figures)}</strong></div><div>Дополнения<strong>${money(totals.extras)}</strong></div><div>Оформление с включёнными фигурками<strong>${money(totals.format)}</strong></div><div class="cart-grand-total">Итого<strong id="cart-total">${money(totals.total)}</strong></div>`;
 $('#save-png').disabled=!totals.ready||exporting;
 $('#order-telegram').setAttribute('aria-disabled',String(!totals.ready));
 $('#cart-guide').textContent=!cart.items.length?'Добавьте хотя бы одного персонажа.':hasUnavailable()?'Проверьте персонажей с удалёнными деталями перед сохранением заказа.':cart.needsReview?'В старой корзине было несколько оформлений. Распределите персонажей по группам и подтвердите выбор.':!totals.ready?'В каждой рамке, колбе и брелке должен быть персонаж. Заполните пустые группы или удалите их.':'Сохраните лист заказа в PNG, затем прикрепите файл в Telegram. Если листов несколько, отправьте все.';
 if($('#cart-review'))$('#cart-review').hidden=!cart.needsReview;
}
function removeGroup(id){cart.groups=cart.groups.filter(g=>g.id!==id);for(const item of cart.items)if(item.groupId===id)item.groupId='none';}
function setFormatQuantity(type,quantity){
 if(!Number.isSafeInteger(quantity)||quantity<0||quantity>999){toast('Количество — целое число от 0 до 999.');renderCart();return;}
 const groups=cart.groups.filter(g=>g.type===type);
 if(quantity<groups.length)for(const g of groups.slice(quantity))removeGroup(g.id);
 else for(let i=groups.length;i<quantity;i++)cart.groups.push(newGroup(type));
 changedCart();renderCart();
}
$('#cart-packaging')?.addEventListener('change',e=>{
 const type=e.target.value;if(!packagingOptions.some(p=>p.id===type&&p.id!=='none'))return;
 setFormatQuantity(type,cart.groups.filter(g=>g.type===type).length+1);
 toast('Оформление добавлено. Выберите его у нужных персонажей.');
});
$('#packaging-items')?.addEventListener('change',e=>{if(e.target.matches('[data-format-quantity]'))setFormatQuantity(e.target.dataset.formatQuantity,Number(e.target.value));});
$('#packaging-items')?.addEventListener('click',e=>{const step=e.target.closest('[data-format-step]');if(step){const type=step.dataset.formatStep;setFormatQuantity(type,cart.groups.filter(g=>g.type===type).length+Number(step.dataset.step));$('#packaging-items').querySelector(`[data-format-step="${type}"][data-step="${step.dataset.step}"]`)?.focus({preventScroll:true});}});
$('#cart-review')?.addEventListener('click',()=>{cart.needsReview=false;changedCart();renderCart();});
$('#cart-items')?.addEventListener('change',e=>{
 if(!e.target.matches('[data-cart-group]'))return;
 if(!assignGroup(cart,e.target.dataset.cartGroup,e.target.value))toast('В брелок можно добавить только одного персонажа.');
 changedCart();renderCart();
});
$('#add-cart')?.addEventListener('click',async()=>{
 if(adding)return;adding=true;const button=$('#add-cart'),snapshot={...selection},editAtClick=editingId;
 button.disabled=true;button.textContent='Готовлю персонажа…';
 try{
  const {createCartPreviews}=await import('./export-order.js');
  const previews=await createCartPreviews(snapshot,parts);
  if(editAtClick!==editingId){toast('Выбор изменился. Добавьте персонажа ещё раз.');return;}
  const groupId=editAtClick?cart.items.find(i=>i.id===editAtClick)?.groupId||'none':'none';
  const item={groupId,id:editAtClick||globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2),selection:snapshot,details:snapshotDetails(snapshot,parts),...previews};
  if(editAtClick){
   const index=cart.items.findIndex(i=>i.id===editAtClick);if(index<0)throw Error('Персонаж удалён.');cart.items[index]=item;selection=previousDraft||{...startingSelection};editingId=null;previousDraft=null;
  }else{
   if(!cart.items.length)cart={...newCart(),groups:cart.groups,needsReview:cart.needsReview,items:[]};
   cart.items.push(item);if(JSON.stringify(selection)===JSON.stringify(snapshot))selection={...startingSelection};
  }
  changedCart();renderCart();render();
  toast(cartSaved?(editAtClick?'Изменения персонажа сохранены.':`Персонаж ${cart.items.length} добавлен. Соберите следующего.`):'Персонаж добавлен. Скачайте заказ: браузер не смог сохранить корзину.');
 }catch{toast('Не удалось добавить персонажа. Попробуйте ещё раз.');}
 finally{adding=false;button.disabled=false;button.textContent=editingId?'Сохранить изменения':'Добавить персонажа в корзину';}
});
$('#cart-items')?.addEventListener('click',e=>{
 const groupRemove=e.target.closest('[data-group-remove]');if(groupRemove){removeGroup(groupRemove.dataset.groupRemove);changedCart();renderCart();return;}
 const remove=e.target.closest('[data-cart-remove]'),edit=e.target.closest('[data-cart-edit]');
 if(remove){
  const id=remove.dataset.cartRemove;cart.items=cart.items.filter(i=>i.id!==id);
  if(editingId===id){editingId=null;selection=previousDraft||{...startingSelection};previousDraft=null;}
  changedCart();renderCart();render();$('#cart-title')?.focus({preventScroll:true});
 }else if(edit){
  const item=cart.items.find(i=>i.id===edit.dataset.cartEdit);if(!item)return;
  if(editingId&&editingId!==item.id){toast('Сначала сохраните или отмените текущее изменение.');return;}
  if(!editingId)previousDraft={...selection};editingId=item.id;let missing=false;
  selection=Object.fromEntries(categories.map(c=>{const id=item.selection[c.id];const valid=parts.some(p=>p.id===id&&p.category===c.id);if(!valid)missing=true;return [c.id,valid?id:startingSelection[c.id]];}));
  render();$('#studio').scrollIntoView({block:'start'});$('#add-cart').focus({preventScroll:true});
  if(missing)toast('Каталог обновился. Проверьте детали перед сохранением.');
 }
});
$('#cancel-edit')?.addEventListener('click',()=>{selection=previousDraft||{...startingSelection};editingId=null;previousDraft=null;render();});
function downloadFile(url,filename){const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();}
$('#save-png')?.addEventListener('click',async()=>{
 const button=$('#save-png');if(exporting||!cartTotals(cart).ready)return;exporting=true;
 const snapshot=JSON.parse(JSON.stringify(cart)),revision=cartRevision;button.disabled=true;button.textContent='Готовлю лист заказа…';
 try{
  const {createOrderPngs}=await import('./export-order.js');const files=await createOrderPngs(snapshot);
  if(revision!==cartRevision)throw Error('Корзина изменилась. Сохраните заказ ещё раз.');
  invalidateOrderFiles();
  const links=files.map((file,index)=>{const url=URL.createObjectURL(file.blob);orderUrls.push(url);return {url,filename:file.filename,index};});
  $('#order-downloads').innerHTML=links.map(file=>`<a${file.index===0?' id="png-link"':''} href="${file.url}" download="${file.filename}" target="_blank" rel="noopener noreferrer">${links.length>1?`Лист ${file.index+1} из ${links.length}`:'Открыть PNG заказа'}</a>`).join('');
  $('#png-ready').hidden=false;downloadFile(links[0].url,links[0].filename);
 }catch(error){toast(error.message?.includes('изменилась')?error.message:'Не удалось сохранить PNG. Попробуйте ещё раз.');}
 finally{exporting=false;button.disabled=!cartTotals(cart).ready;button.textContent='Сохранить заказ в PNG';}
});
$('#order-telegram')?.addEventListener('click',e=>{if(!cartTotals(cart).ready){e.preventDefault();toast(hasUnavailable()?'Проверьте персонажей с удалёнными деталями.':cart.items.length?'Заполните группы оформления и проверьте распределение.':'Сначала добавьте персонажа в корзину.');}});

for(const d of document.querySelectorAll('dialog')){d.querySelector('.close')?.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});}
render();renderCart();
