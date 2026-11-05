const dialog=document.querySelector('#work-lightbox');
if(dialog){
 const cards=[...document.querySelectorAll('#works-grid .work-card')];
 const filters=document.querySelector('.work-filters');
 const entries=cards.map(card=>({card,link:card.querySelector('.work-open'),title:card.querySelector('h2').textContent,category:card.querySelector('.work-category').textContent,image:card.querySelector('img')}));
 let visible=entries,index=0,opener;
 const full=document.querySelector('#work-full');
 function show(next){
  index=(next+visible.length)%visible.length;
  const entry=visible[index];
  full.alt=entry.image.alt;full.src=entry.link.href;
  document.querySelector('#work-lightbox-title').textContent=entry.title;
  document.querySelector('#work-lightbox-category').textContent=entry.category;
  document.querySelector('#work-position').textContent=`${index+1} / ${visible.length}`;
  document.querySelector('#work-download').href=entry.link.href;
 }
 filters.hidden=false;
 filters.addEventListener('click',event=>{
  const button=event.target.closest('[data-filter]');if(!button)return;
  const category=button.dataset.filter;
  for(const choice of filters.querySelectorAll('button'))choice.setAttribute('aria-pressed',String(choice===button));
  for(const entry of entries)entry.card.hidden=category!=='all'&&entry.card.dataset.category!==category;
  visible=entries.filter(entry=>!entry.card.hidden);
  document.querySelector('#work-count').textContent=`${visible.length} фото`;
 });
 for(const entry of entries)entry.link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();opener=entry.link;
  show(visible.indexOf(entry));dialog.showModal();document.querySelector('#work-close').focus();document.documentElement.classList.add('lightbox-open');
 });
 function finishClose(){document.documentElement.classList.remove('lightbox-open');opener?.focus({preventScroll:true});}
 function closeViewer(){dialog.close();finishClose();}
 document.querySelector('#work-close').onclick=closeViewer;
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeViewer();});
 document.querySelector('#work-prev').onclick=()=>show(index-1);
 document.querySelector('#work-next').onclick=()=>show(index+1);
 dialog.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}
  if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}
 });
 dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeViewer();
 });
 // Native close events are queued; do not unlock a viewer already reopened.
 dialog.addEventListener('close',()=>{if(!dialog.open)finishClose();});
}
