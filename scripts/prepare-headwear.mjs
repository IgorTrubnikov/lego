// Rebuild the seven reviewed headwear cutouts. Requires Playwright and Chromium.
import {chromium} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),manifest=JSON.parse(await readFile(new URL('headwear/manifest.json',import.meta.url)));

const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const [index,p] of manifest.entries()){
  const source=(await readFile(new URL('headwear/'+(p.source||'source.png'),import.meta.url))).toString('base64');
  const [bx,by,bw,bh]=p.box,scale=p.width/bw,height=p.height??bh*scale,x=300-p.width/2,y=224-height;
  const art=`<defs><clipPath id="cutout"><path d="${p.path}"/></clipPath></defs><g transform="translate(${x} ${y}) scale(${scale} ${height/bh}) translate(${-bx} ${-by})"><image width="1280" height="1280" clip-path="url(#cutout)" href="data:image/png;base64,${source}"/></g>`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720">${art}</svg>`;
  const raster=await page.evaluate(async({svg,normalize,x,y,width,height})=>{
   const i=new Image();i.src='data:image/svg+xml;base64,'+btoa(svg);await i.decode();
   const c=document.createElement('canvas');c.width=600;c.height=720;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
   if(normalize){
    // Use the solid contour and a shared integer pixel frame; fractional edges
    // otherwise leave one cap a pixel narrower after alpha resampling.
    const pixels=ctx.getImageData(0,0,600,720).data;let left=600,top=720,right=0,bottom=0;
    for(let py=0;py<720;py++)for(let px=0;px<600;px++)if(pixels[(py*600+px)*4+3]>160){left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);}
    const out=document.createElement('canvas');out.width=600;out.height=720;out.getContext('2d').drawImage(c,left,top,right-left+1,bottom-top+1,300-Math.round(width)/2,224-Math.round(height),Math.round(width),Math.round(height));return out.toDataURL('image/png').split(',')[1];
   }
   return c.toDataURL('image/png').split(',')[1];
  },{svg,normalize:p.normalizeBounds,x,y,width:p.width,height});
  const version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12),label=`${63+index} · ${p.name}`;
  const box=`${x-6} ${y-6} ${p.width+12} ${height+12}`;
  await writeFile(new URL(`haircuts/headwear-${p.slug}__0__${label}.svg`,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="${box}" data-catalog-order="${630+index*10}" data-asset-version="${version}"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
}finally{await browser.close();}
