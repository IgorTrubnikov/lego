// Import six short leg colors and two sleeveless tops, preserving transparent gaps.
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'scripts/short-legs-tanks/sheet.png');
const colors=['голубые','коричневые','белые','чёрные','серые','бежевые'];
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status)throw Error(r.stderr);return r.stdout.trim();}
const [sw,sh]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
const temp=mkdtempSync(path.join(os.tmpdir(),'short-legs-tanks-'));
try{
 const outputs=[];
 for(let index=0;index<8;index++){
  const col=index%4,row=Math.floor(index/4),left=Math.floor(col*sw/4),right=Math.floor((col+1)*sw/4),top=Math.floor(row*sh/2),bottom=Math.floor((row+1)*sh/2);
  const crop=path.join(temp,index+'.png'),out=path.join(temp,index+'.webp');
  magick([source,'-crop',`${right-left}x${bottom-top}+${left}+${top}`,'+repage','-channel','A','-fx','u<0.15?0:u','+channel','-trim','+repage',crop]);
  let art,box,label,folder,slug,metadata;
  if(index<6){
   // All color variants share the same physical short-leg dimensions and floor.
   magick([crop,'-resize','224x138!','-background','none','-gravity','northwest','-splice','188x509','-extent','600x720','-strip','-define','webp:lossless=true',out]);
   const bytes=readFileSync(out);art=`<image width="600" height="720" href="data:image/webp;base64,${bytes.toString('base64')}"/>`;
   box='182 503 236 150';label=`${index+29} · Короткие ${colors[index]}`;folder='pants';slug='catalog-short-'+(index+29);metadata='data-height-offset="48"';
  }else{
   const [w,h]=magick(['identify','-format','%w %h',crop]).split(' ').map(Number);
   const front=h-22,handHeight=Math.max(22,Math.round(22*322/w));
   const bytes=readFileSync(crop);
   art=`<defs><image id="top" width="${w}" height="${h}" href="data:image/png;base64,${bytes.toString('base64')}"/><clipPath id="front"><rect x="139" y="317" width="322" height="193"/></clipPath><clipPath id="hands"><rect x="139" y="510" width="322" height="${handHeight}"/></clipPath></defs><g clip-path="url(#front)"><use href="#top" transform="translate(139 317) scale(${322/w} ${193/front})"/></g><g clip-path="url(#hands)"><use href="#top" transform="translate(139 ${510-handHeight*front/22}) scale(${322/w} ${handHeight/22})"/></g>`;
   box=`133 311 334 ${205+handHeight}`;label=`${index+44} · ${index===6?'Чёрная':'Белая'} майка без рукавов`;folder='clothes';slug='tank-'+(index+44);metadata=`data-legs-top="510" data-catalog-order="${index===6?145:146}"`;
  }
  const version=createHash('sha256').update(art).digest('hex').slice(0,12);
  outputs.push({file:path.join(root,folder,`${slug}__0__${label}.svg`),svg:`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-preview-box="${box}" data-asset-version="${version}" ${metadata}><title>${label}</title>${art}</svg>\n`});
 }
 for(const out of outputs)writeFileSync(out.file,out.svg);
 console.log('Prepared short legs 29–34 and sleeveless tops 50–51, all included in figure price.');
}finally{rmSync(temp,{recursive:true,force:true});}
