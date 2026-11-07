const viewer=document.querySelector('#review-viewer');
if(viewer){
 const links=[...document.querySelectorAll('.review-open')],image=document.querySelector('#review-full'),scroll=document.querySelector('.review-scroll');
 let index=0,opener;
 function show(next){
  index=(next+links.length)%links.length;const link=links[index];
  image.src=link.href;image.alt=link.querySelector('img').alt;
  document.querySelector('#review-title').textContent=link.closest('figure').querySelector('figcaption').textContent;
  document.querySelector('#review-position').textContent=`${index+1} / ${links.length}`;
  document.querySelector('#review-original').href=link.href;
  scroll.scrollTop=0;
 }
 function finishClose(){document.documentElement.classList.remove('lightbox-open');opener?.focus({preventScroll:true});}
 function close(){viewer.close();finishClose();}
 for(const [i,link] of links.entries())link.addEventListener('click',event=>{
  if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();opener=link;show(i);viewer.showModal();document.documentElement.classList.add('lightbox-open');document.querySelector('#review-close').focus();
 });
 document.querySelector('#review-close').onclick=close;
 document.querySelector('#review-prev').onclick=()=>show(index-1);
 document.querySelector('#review-next').onclick=()=>show(index+1);
 viewer.addEventListener('cancel',event=>{event.preventDefault();close();});
 viewer.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(index-1);}if(event.key==='ArrowRight'){event.preventDefault();show(index+1);}});
 viewer.addEventListener('click',event=>{if(event.target!==viewer)return;const r=viewer.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close();});
 viewer.addEventListener('close',()=>{if(!viewer.open)finishClose();});
}
