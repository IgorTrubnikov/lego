// Replace the twenty printed torsos, retaining their IDs, labels and catalog order.
import {chromium} from '@playwright/test';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('detailed-torsos/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base)));
const files=await readdir(new URL('clothes/',root));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium'});
try{
 const page=await browser.newPage();
 for(const p of manifest){
  const source=(await readFile(new URL(p.sheet+'.png',base))).toString('base64');
  const name=files.find(name=>name.startsWith('catalog-'+String(p.number).padStart(2,'0')+'__0__'));
  if(!name)throw Error('Missing existing torso '+p.number);
  const old=await readFile(new URL('clothes/'+name,root),'utf8');
  const label=old.match(/<title>(.*?)<\/title>/)[1],order=old.match(/data-catalog-order="(\d+)"/)[1];
  const raster=await page.evaluate(async({p,source})=>{
   const image=new Image();image.src='data:image/png;base64,'+source;await image.decode();const [sx,sy,w,h]=p.box;
   const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d'),bottom=p.front/h;
   // Reviewed physical silhouette. The open grips and gaps beside the torso
   // exclude the background without replacing any clothing print.
   // Continuous inner sleeve edges keep the channels open instead of pinching
   // them into diamonds; tighter lower corners exclude the source matte.
   const path=new Path2D(`M.29 .005 L.71 .005 Q.72 .005 .73 .04 Q.84 .035 .91 .26 L.97 .58 L.965 .68 Q1 .75 1 .84 Q1 .97 .94 1 L.925 .90 Q.89 .84 .855 .90 L.84 1 Q.77 1 .765 .93 L.77 .82 L.78 .78 Q.78 .70 .78 .58 L.73 .33 L.775 ${bottom} L.225 ${bottom} L.27 .33 L.22 .58 Q.22 .70 .22 .78 L.23 .82 L.235 .93 Q.23 1 .16 1 L.145 .90 Q.11 .84 .075 .90 L.06 1 Q0 .97 0 .84 Q0 .75 .035 .68 L.03 .58 L.09 .26 Q.16 .035 .27 .04 Q.28 .005 .29 .005 Z`);
   ctx.scale(w,h);ctx.clip(path);ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(image,sx,sy,w,h,0,0,w,h);
   const out=document.createElement('canvas');out.width=600;out.height=720;const o=out.getContext('2d');
   o.drawImage(c,0,0,w,p.front,139,317,322,193);o.drawImage(c,0,p.front,w,h-p.front,139,510,322,22);
   // Replace the irregular source-side fringe with straight, antialiased
   // panel edges. Keep the arms/hands and the central print unchanged.
   const pixels=o.getImageData(0,0,600,720),original=new Uint8ClampedArray(pixels.data);
   for(let y=345;y<510;y++){
    const t=(y-317)/193,fade=Math.min(1,(y-345)/35),left=139+322*(.29-.065*t)+3*fade,right=600-left;
    for(const side of [-1,1]){
     const edge=side===-1?left:right;
     const hand=(i)=>y>=480&&(p.number===33||p.number===37
      ?original[i]>160&&original[i+1]>160&&original[i+2]>160
      :original[i]>130&&original[i+1]>70&&original[i+2]>30&&original[i]>original[i+1]*1.13&&original[i+1]>original[i+2]*1.12);
     for(let step=-7;step<=1;step++){
      const x=side===-1?Math.floor(edge)+step:Math.ceil(edge)-step,i=(y*600+x)*4;
      if(hand(i))continue;
      const coverage=Math.max(0,Math.min(1,side===-1?x+1-edge:edge-x));
      if(coverage===0){pixels.data[i+3]=Math.round(original[i+3]*(1-fade));continue;}
      let anchor=x;
      for(let d=0;d<10&&original[(y*600+anchor)*4+3]<245;d++)anchor-=side;
      const source=(y*600+anchor)*4;
      if(original[i+3]<245){for(let c=0;c<3;c++)pixels.data[i+c]=original[source+c];}
      pixels.data[i+3]=Math.round(original[i+3]*(1-fade)+255*coverage*fade);
     }
     if((p.number===33||p.number===37)&&y>=(p.number===33?445:460)&&y<=505){
      const samples=[[],[],[]];
      for(let dy=-5;dy<=5;dy++)for(let d=20;d<=40;d++){
       const x=Math.round(edge-side*d),i=((y+dy)*600+x)*4,[r,g,b]=original.slice(i,i+3);
       const fabric=p.number===33?g>100&&b>100&&r<g*.45:r>205&&g>55&&b>130&&g<r*.65;
       if(original[i+3]>245&&fabric)for(let c=0;c<3;c++)samples[c].push(original[i+c]);
      }
      const color=samples.map(values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)]);
      if(color.every(v=>v!==undefined))for(let d=1;d<30;d++){
       const x=Math.round(edge-side*d),i=(y*600+x)*4;
       if(original[i]+original[i+1]+original[i+2]<color[0]+color[1]+color[2]-15&&pixels.data[i+3]>245)for(let c=0;c<3;c++)pixels.data[i+c]=color[c];
      }
     }
    }
   }
   o.putImageData(pixels,0,0);
   return out.toDataURL('image/png').split(',')[1];
  },{p,source});
  const version=createHash('sha256').update(Buffer.from(raster,'base64')).digest('hex').slice(0,12);
  await writeFile(new URL('clothes/'+name,root),`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="133 311 334 227" data-legs-top="510" data-catalog-order="${order}" data-asset-version="${version}"><title>${label}</title><image width="600" height="720" href="data:image/png;base64,${raster}"/></svg>\n`);
 }
}finally{await browser.close();}
