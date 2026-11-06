// Local import of four transparent 4 × 4 sheets and optional 2 × 1 frontal caps.
// ImageMagick slices and positions the prepared artwork; SVG clips keep faces clear.
// Usage: node scripts/prepare-hair-assets.mjs sheet1.png sheet2.png sheet3.png sheet4.png caps.png
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {escapeHtml} from '../parts.js';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
// Slug, customer-facing name, fitting profile. Each reference position stays distinct.
export const hairItems=[
 ['long-golden','Длинная волнистая золотистая','long'],['long-chestnut','Длинная волнистая каштановая','long'],['short-honey','Короткая медовый блонд','short'],['short-ginger-classic','Короткая рыжеватая','short'],
 ['short-black-curly','Короткая чёрная кудрявая','short'],['short-black-classic','Короткая чёрная с зачёсом','short'],['short-pale-blond','Короткая светлый блонд','short'],['short-dark-blond','Короткая светло-русая','short'],
 ['long-black-ringlets','Длинные локоны чёрные','long'],['long-dark-ringlets','Длинные локоны тёмно-коричневые','long'],['long-brown-ringlets','Длинные локоны коричневые','long'],['long-copper-ringlets','Длинные локоны рыжие','long'],
 ['short-black-fringe','Короткая чёрная с чёлкой','short'],['short-black-quiff','Короткая чёрная приподнятая','short'],['short-black-bowl','Короткая чёрная прямая','short'],['medium-black-side','Средняя чёрная с зачёсом','medium'],
 ['short-auburn','Короткая тёмно-красная','short'],['short-white','Короткая белая','short'],['short-red-bowl','Короткая красная прямая','short'],['short-black-part','Короткая чёрная с пробором','short'],
 ['short-brown','Короткая коричневая','short'],['short-copper-curly','Короткая медная кудрявая','short'],['short-red-swept','Короткая красная с зачёсом','short'],['medium-black-pony','Средняя чёрная с хвостиком','medium'],
 ['wavy-fringe-black','Волнистая с чёлкой чёрная','long'],['wavy-fringe-copper','Волнистая с чёлкой рыжая','long'],['wavy-fringe-brown','Волнистая с чёлкой коричневая','long'],['wavy-fringe-golden','Волнистая с чёлкой блонд','long'],
 ['cap-white','Кепка белая','cap'],['cap-black','Кепка чёрная','cap'],['short-black-tight-curls','Короткая чёрная мелкие кудри','short'],['short-bright-ginger','Короткая ярко-рыжая','short'],
 ['medium-blond','Средняя блонд с зачёсом','medium'],['long-caramel','Длинная светло-коричневая','long'],['long-yellow-blond','Длинная жёлтый блонд','long'],['short-gray','Короткая серая','short'],
 ['short-orange-part','Короткая рыжая с пробором','short'],['wavy-side-copper','Волнистая рыжая с прядью','long'],['wavy-side-black','Волнистая чёрная с прядью','long'],['wavy-center-chestnut','Волнистая каштановая с пробором','long'],
 ['short-copper-choppy','Короткая рваная с чёлкой','short'],['side-dark-face-locks','Тёмный зачёс с прядями у лица','medium'],['short-rust-fringe','Короткая прямая чёлка рыжая','short'],['auburn-flipped','Удлинённые волны красно-коричневые','medium'],
 ['side-copper-neat','Аккуратный зачёс набок рыжий','short'],['center-dark-wavy','Пробор по центру тёмный','short'],['center-brown-wavy','Пробор по центру коричневый','short'],['long-cream-blond','Длинные мягкие волны кремовый блонд','long'],
 ['long-chestnut-fringe','Длинная каштановая с прямой чёлкой','long'],['long-amber-side','Длинная янтарная с волнами','long'],['long-black-fringe','Длинная чёрная с кудрявыми прядями','long'],['bun-black','Высокий пучок чёрный','bun'],
 ['updo-black-curly','Собранные кудри чёрные','updo'],['braid-black','Чёрная коса','pony'],['bob-black-blunt','Чёрное каре с прямой чёлкой','medium'],['pony-brown','Хвост с прядями коричневый','pony'],
 ['pony-blond','Хвост с прядями блонд','pony'],['pony-burgundy','Хвост с прядями бордовый','pony'],['pony-black','Хвост с прядями чёрный','pony'],
];
const fitting={short:{width:208,y:128},medium:{width:224,y:128},long:{width:240,y:128},cap:{width:215,y:134},bun:{width:210,y:43},updo:{width:215,y:53},pony:{width:225,y:104}};
function magick(args){const r=spawnSync('magick',args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();}
export function prepare(sources){
 if(sources.length<4||sources.length>5)throw Error('Provide four transparent 4 × 4 sheets, optionally followed by a frontal 2 × 1 cap sheet.');
 const capSource=sources[4];
 const temporary=mkdtempSync(path.join(os.tmpdir(),'hair-assets-'));
 try{
  const outputs=[];
  for(const [sheetIndex,source] of sources.slice(0,4).entries()){
   const [width,height]=magick(['identify','-format','%w %h',source]).split(' ').map(Number);
   if(width!==height||width<800)throw Error('Expected a square 4 × 4 sheet.');
   for(let i=0;i<16;i++){
    const item=hairItems[sheetIndex*16+i];if(!item)break;
    const [slug,name,profile]=item;
    let {width:targetWidth,y}=fitting[profile];
    const left=Math.floor(i%4*width/4),top=Math.floor(Math.floor(i/4)*height/4),right=Math.floor((i%4+1)*width/4),bottom=Math.floor((Math.floor(i/4)+1)*height/4);
    let cell=`${right-left}x${bottom-top}+${left}+${top}`,input=source;
    if(profile==='cap'&&capSource){
     const [cw,ch]=magick(['identify','-format','%w %h',capSource]).split(' ').map(Number);
     if(cw!==ch*2)throw Error('Expected a 2 × 1 frontal cap sheet.');
     input=capSource;cell=`${ch}x${ch}+${slug==='cap-black'?ch:0}+0`;targetWidth=184;y=99;
    }
    const trim=magick([input,'-crop',cell,'+repage','-alpha','extract','-threshold','15%','-format','%@','info:']);
    const base=[input,'-crop',cell,'+repage','-crop',trim,'+repage','-filter','Lanczos','-resize',`${targetWidth}x360`];
    const [w,h]=magick([...base,'-format','%w %h','info:']).split(' ').map(Number),x=Math.round(300-w/2);
    const raster=path.join(temporary,slug+'.webp');
    magick([...base,'-background','none','-gravity','northwest','-splice',`${x}x${y}`,'-extent','600x720','-strip','-define','webp:lossless=true',raster]);
    const data=readFileSync(raster).toString('base64'),back=['long','medium','pony','bun','updo'].includes(profile);
    const id='catalog-'+slug,backPath=`./assets/hair-backs/${id}.svg`;
    // Narrow the wig silhouette around the shared head without shortening the locks.
    const scale=({long:.9,medium:.94,pony:.94,bun:.98,updo:.95})[profile]||1;
    const transform=`translate(${300*(1-scale)} 0) scale(${scale} 1)`;
    const opening=back?'M165 35H435V490H372V236Q372 218 358 211Q300 190 242 211Q228 218 228 236V490H165Z':'M165 35H435V490H356V224C336 225 316 215 300 211C282 222 263 225 244 224V490H165Z';
    const naturalVisor=profile==='cap'&&capSource;
    const frontClip=naturalVisor?'':`<defs><clipPath id="front"><path d="${opening}"/></clipPath></defs>`;
    const image=`<image width="600" height="720" transform="${transform}" href="data:image/webp;base64,${data}"/>`;
    // Clip in head coordinates, outside the scaled image; caps retain their actual visor.
    const content=naturalVisor?image:`${frontClip}<g clip-path="url(#front)">${image}</g>`;
    const rear=back?`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720"><defs><clipPath id="back"><rect x="0" y="211" width="600" height="509"/></clipPath></defs><g clip-path="url(#back)">${image}</g></svg>\n`:null;
    const version=createHash('sha256').update(content).update(rear||'').digest('hex').slice(0,12);
    const front=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720" data-render-style="glossy-plastic" data-asset-version="${version}" data-preview-box="${Math.floor(x*scale+300*(1-scale))-6} ${y-6} ${Math.ceil(w*scale)+12} ${h+12}"${back?` data-back-image="${backPath}"`:''}><title>${escapeHtml(name)}</title>${content}</svg>\n`;
    outputs.push({filename:`${id}__200__${name}.svg`,front,rear,backPath});
   }
  }
  if(outputs.length!==59)throw Error('Expected 59 hair and hat variants.');
  mkdirSync(path.join(root,'assets/hair-backs'),{recursive:true});
  for(const filename of readdirSync(path.join(root,'haircuts')))if(/\.(svg|png|webp)$/i.test(filename))rmSync(path.join(root,'haircuts',filename));
  for(const output of outputs){writeFileSync(path.join(root,'haircuts',output.filename),output.front);if(output.rear)writeFileSync(path.join(root,output.backPath),output.rear);}
  console.log('Prepared 59 hair and hat variants at 200 ₽ each.');
 }finally{rmSync(temporary,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))prepare(process.argv.slice(2));
