// Exercise the shared figure renderer directly; single-figure downloads are no longer in the constructor UI.
export async function exportDraftPng(page){
 await page.evaluate(async()=>{
  const [{createFigurePng},{default:catalog}]=await Promise.all([import('./export-image.js'),import('./catalog.js')]);
  const selection=JSON.parse(localStorage.getItem('teuilor-selection-v1'));
  const blob=await createFigurePng(selection,catalog),url=URL.createObjectURL(blob);
  let a=document.querySelector('#test-figure-png');if(!a){a=document.createElement('a');a.id='test-figure-png';a.hidden=true;a.target='_blank';document.body.append(a);}
  if(a.href.startsWith('blob:'))URL.revokeObjectURL(a.href);a.href=url;a.download='teuilor-personazh.png';a.click();
 });
}
