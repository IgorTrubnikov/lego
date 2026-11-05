// Native <details> keeps navigation usable without JavaScript.
// Close its dropdown after a choice, an outside click or Escape.
document.addEventListener('click',event=>{
 for(const menu of document.querySelectorAll('.mobile-menu[open]')){
  if(!menu.contains(event.target)||event.target.closest('a'))menu.open=false;
 }
});
document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 const menu=document.querySelector('.mobile-menu[open]');
 if(menu){menu.open=false;menu.querySelector('summary').focus();}
});
